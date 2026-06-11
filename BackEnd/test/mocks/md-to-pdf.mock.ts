export async function mdToPdf() {
  return { content: Buffer.from('%PDF-mock'), filename: 'mock.pdf' };
}
