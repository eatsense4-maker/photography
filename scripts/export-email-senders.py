"""Export unique sender addresses from an IMAP mailbox to CSV."""

from __future__ import annotations

import csv
import getpass
import imaplib
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.parser import BytesHeaderParser
from email.policy import default
from email.utils import getaddresses, parsedate_to_datetime
from pathlib import Path

HOST = "server126.web-hosting.com"
PORT = 993
ACCOUNT = "info@fokusaward.com"
OUTPUT = Path(__file__).resolve().parents[1] / "email-senders.csv"


def decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value))).strip()
    except (LookupError, UnicodeError):
        return value.strip()


def parse_mailbox_name(raw_line: bytes) -> str | None:
    line = raw_line.decode("utf-8", errors="replace")
    # IMAP LIST replies end with either a quoted or unquoted mailbox name.
    match = re.search(r' "((?:[^"\\]|\\.)*)"\s*$', line)
    if match:
        return match.group(1).replace(r'\"', '"').replace(r'\\', '\\')
    parts = line.rsplit(" ", 1)
    return parts[-1] if parts else None


def message_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def main() -> int:
    password = getpass.getpass(f"Password for {ACCOUNT}: ")
    senders: dict[str, dict[str, object]] = defaultdict(
        lambda: {"names": set(), "count": 0, "first": None, "last": None}
    )
    seen_messages: set[str] = set()

    try:
        with imaplib.IMAP4_SSL(HOST, PORT) as mailbox:
            mailbox.login(ACCOUNT, password)
            status, listed = mailbox.list()
            if status != "OK":
                raise RuntimeError("Unable to list mailbox folders")

            folders = [name for item in listed if (name := parse_mailbox_name(item))]
            print(f"Scanning {len(folders)} mailbox folders...")

            for folder in folders:
                status, _ = mailbox.select(f'"{folder}"', readonly=True)
                if status != "OK":
                    print(f"Skipping unavailable folder: {folder}", file=sys.stderr)
                    continue

                status, result = mailbox.uid("search", None, "ALL")
                if status != "OK" or not result or not result[0]:
                    continue

                uids = result[0].split()
                print(f"  {folder}: {len(uids)} messages")
                for start in range(0, len(uids), 250):
                    uid_set = b",".join(uids[start : start + 250]).decode("ascii")
                    status, fetched = mailbox.uid(
                        "fetch",
                        uid_set,
                        "(BODY.PEEK[HEADER.FIELDS (FROM MESSAGE-ID DATE)])",
                    )
                    if status != "OK":
                        print(f"Could not fetch part of {folder}", file=sys.stderr)
                        continue

                    for item in fetched:
                        if not isinstance(item, tuple) or not isinstance(item[1], bytes):
                            continue
                        headers = BytesHeaderParser(policy=default).parsebytes(item[1])
                        message_id = decode(headers.get("Message-ID")).lower()
                        dedupe_key = message_id or f"{folder}:{item[0]!r}"
                        if dedupe_key in seen_messages:
                            continue
                        seen_messages.add(dedupe_key)

                        date = message_date(headers.get("Date"))
                        for raw_name, raw_address in getaddresses(headers.get_all("From", [])):
                            address = raw_address.strip().lower()
                            if not address or "@" not in address or address == ACCOUNT:
                                continue
                            record = senders[address]
                            name = decode(raw_name)
                            if name:
                                record["names"].add(name)
                            record["count"] += 1
                            if date is not None:
                                if record["first"] is None or date < record["first"]:
                                    record["first"] = date
                                if record["last"] is None or date > record["last"]:
                                    record["last"] = date

            mailbox.logout()
    except imaplib.IMAP4.error as exc:
        print(f"IMAP authentication or mailbox error: {exc}", file=sys.stderr)
        return 1
    except (OSError, RuntimeError) as exc:
        print(f"Connection error: {exc}", file=sys.stderr)
        return 1
    finally:
        password = ""

    with OUTPUT.open("w", newline="", encoding="utf-8-sig") as output_file:
        writer = csv.writer(output_file)
        writer.writerow(["email", "name", "message_count", "first_seen_utc", "last_seen_utc"])
        for address, record in sorted(senders.items()):
            first = record["first"]
            last = record["last"]
            writer.writerow(
                [
                    address,
                    "; ".join(sorted(record["names"])),
                    record["count"],
                    first.isoformat() if first else "",
                    last.isoformat() if last else "",
                ]
            )

    print(f"Exported {len(senders)} unique sender addresses to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
