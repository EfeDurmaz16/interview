declare module "https://cdn.jsdelivr.net/npm/php-wasm/PhpWeb.mjs"{
  export class PhpWeb {
    constructor();

    addEventListener(type: string, listener: any): void;
    removeEventListener(type: string, listener: any): void;

    inputString(input: string): void;
    run(code: string): Promise<number>;
  }
}