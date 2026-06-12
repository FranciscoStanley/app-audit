export function mdToPdf() {
  return Promise.resolve({
    content: Buffer.from('%PDF-mock'),
    filename: 'mock.pdf',
  });
}
