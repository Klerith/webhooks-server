import { NextFunction, Request, Response } from 'express';
import { envs } from '../../config';

export class GithubSha256Middleware {
  private static encoder = new TextEncoder();

  static async verifyGithubSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const xHubSignature = `${req.headers['x-hub-signature-256']}`;
    const body = JSON.stringify(req.body);
    const secret = envs.SECRET_TOKEN;

    const isValid = await GithubSha256Middleware.verifySignature(
      secret,
      xHubSignature,
      body
    );

    if (isValid) {
      next();
    } else {
      res.status(401).json({ error: 'Invalid signature' });
    }
  }

  private static async verifySignature(
    secret: string,
    header: string,
    payload: string
  ) {
    try {
      let parts = header.split('=');
      let sigHex = parts[1];

      let algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } };

      let keyBytes = GithubSha256Middleware.encoder.encode(secret);
      let extractable = false;
      let key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        algorithm,
        extractable,
        ['sign', 'verify']
      );

      let sigBytes = GithubSha256Middleware.hexToBytes(sigHex);
      let dataBytes = GithubSha256Middleware.encoder.encode(payload);
      let equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes
      );

      return equal;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  private static hexToBytes(hex: string) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
      let c = hex.slice(i, i + 2);
      let b = parseInt(c, 16);
      bytes[index] = b;
      index += 1;
    }

    return bytes;
  }
}
