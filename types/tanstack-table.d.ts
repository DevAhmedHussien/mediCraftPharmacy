import "@tanstack/react-table";

/* `meta` is typed as `unknown` by default. Declaring the shape here means
   `columnDef.meta?.align` is checked rather than cast at every use site. */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    align?: "left" | "right";
  }
}
