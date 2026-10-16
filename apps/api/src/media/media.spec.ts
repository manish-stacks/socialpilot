import { validateUpload } from './media.service';
describe('validateUpload', () => {
  it('accepts png under limit', () => expect(() => validateUpload('image/png', 1000)).not.toThrow());
  it('rejects executables', () => expect(() => validateUpload('application/x-msdownload', 10)).toThrow());
  it('rejects oversize images', () => expect(() => validateUpload('image/png', 11 * 1024 * 1024)).toThrow());
});
