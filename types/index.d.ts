// index.d.ts
declare global {
  namespace Express {
    interface Request {
      customer?: {
        userId: string;
        email: string;
      };
      manager?: {
        userId: string;
        email: string;
      };
    }
  }
}

export {};