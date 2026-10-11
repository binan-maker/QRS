// Type declarations for canvas-confetti module in Next.js web application

declare module "canvas-confetti" {
  export interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    shapes?: ("square" | "circle" | "star")[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
  }

  export interface CreateOptions extends ConfettiOptions {
    resize?: boolean;
    useWorker?: boolean;
  }

  export interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<null> | null;
    reset: () => void;
    create: (canvas: HTMLCanvasElement, options?: CreateOptions) => ConfettiFunction;
  }

  const confetti: ConfettiFunction;
  export default confetti;
}
