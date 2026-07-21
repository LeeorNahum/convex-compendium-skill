export declare function query<Args, Output>(
  handler: (ctx: { db: unknown }, args: Args) => Promise<Output>,
): unknown;

export declare function mutation<Args, Output>(
  handler: (ctx: { db: unknown }, args: Args) => Promise<Output>,
): unknown;
