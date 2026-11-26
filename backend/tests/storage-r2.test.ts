import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveFile, readFile, deleteFile } from '../src/services/storage.service';

const env = {
  R2_ACCOUNT_ID: 'acct123',
  R2_ACCESS_KEY_ID: 'AKID',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'kavach-files',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('R2 storage', () => {
  const useR2 = (reply: Response) => {
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    const fetchMock = vi.fn().mockResolvedValue(reply);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('puts, gets and deletes signed S3 requests', async () => {
    const data = Buffer.from('hello');
    const put = useR2(new Response(null, { status: 200 }));
    const key = await saveFile(data, { ext: 'png' });
    const [url, init] = put.mock.calls[0];
    expect(url).toBe(`https://acct123.r2.cloudflarestorage.com/kavach-files/${key}`);
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);

    const get = useR2(new Response(data));
    expect((await readFile(key)).equals(data)).toBe(true);
    expect(get.mock.calls[0][1].method).toBe('GET');

    const del = useR2(new Response(null, { status: 404 }));
    await deleteFile(key);
    expect(del.mock.calls[0][1].method).toBe('DELETE');
  });

  it('fails when R2 refuses and rejects keys it did not generate', async () => {
    useR2(new Response(null, { status: 403 }));
    await expect(saveFile(Buffer.from('x'), { ext: 'pdf' })).rejects.toThrow('R2 PUT failed with 403');
    await expect(readFile('../../etc/passwd')).rejects.toThrow('Invalid storage key');
  });
});
