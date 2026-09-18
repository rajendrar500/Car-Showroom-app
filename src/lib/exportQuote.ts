export const EXPORT_PORTS = [
  { id: 'incheon', inland: 0, ocean: 0, docs: 0.003 },
  { id: 'jebel-ali', inland: 0.007, ocean: 0.032, docs: 0.005 },
  { id: 'jeddah', inland: 0.007, ocean: 0.036, docs: 0.005 },
  { id: 'doha', inland: 0.007, ocean: 0.034, docs: 0.005 },
] as const;

export type ExportPortId = (typeof EXPORT_PORTS)[number]['id'];

export function quoteExport(price: number, portId: string) {
  const port = EXPORT_PORTS.find((item) => item.id === portId) ?? EXPORT_PORTS[1];
  const inland = Math.round(price * port.inland);
  const ocean = Math.round(price * port.ocean);
  const docs = Math.round(price * port.docs);
  const fee = Math.round(price * 0.018);
  return {
    inland,
    ocean,
    docs,
    fee,
    total: price + inland + ocean + docs + fee,
  };
}
