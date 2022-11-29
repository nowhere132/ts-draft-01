import { RideRequest, TaxiStatus } from "./interfaces";

type InsertionChecking = {
  readonly isFeasible: (req: RideRequest, taxi: TaxiStatus, insertionPos: number, t: Date) => boolean;
};

const InsertionCheckingVer1: InsertionChecking = {
  isFeasible: (req: RideRequest, taxi: TaxiStatus, insertionPos: number, t: Date) => {
    // TODO:  impl
    return false;
  },
};

