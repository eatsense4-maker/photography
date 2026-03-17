// Type declarations for Supabase Edge Functions (Deno runtime)
// These suppress VS Code errors for Deno-specific APIs and URL imports

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export { createClient } from '@supabase/supabase-js';
}

declare module 'https://deno.land/x/aws_sign_v4@1.0.2/mod.ts' {
  export class AwsSignerV4 {
    constructor(options: {
      region: string;
      service: string;
      accessKeyId: string;
      secretAccessKey: string;
    });
    sign(method: string, url: string | URL, headers?: Headers): Promise<Headers>;
  }
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
