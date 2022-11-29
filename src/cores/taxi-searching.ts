import { RideRequest, TaxiStatus } from "./interfaces";
import { GenericCalculation, MapUtils } from "./utils";

enum TaxiEvents {
  MOVE = 'taxi.move',
}

enum GridEvents {
  TAXI_LEAVE = 'grid.taxi-leave',
}


enum TaxiSearchingStrategy {
  SINGLE_SIDE = 'single-side',
  DUAL_SIDE = 'dual-side',
}

type TaxisSearching = {
  readonly candidateTaxis: (req: RideRequest) => readonly TaxiStatus[];
};



const SingleSideSearching: TaxisSearching = {
  /**
   * @returns taxis which can reach origin point in time (req.wp.l)
   */
  candidateTaxis: (req: RideRequest) => {
    const originPointIdx = MapUtils.getPointIdx(req.o);

    const reachablePoints = GenericCalculation.reachablePoints(
      originPointIdx.temporally_ordered_points,
      req.o,
      Math.floor((req.wp.l.getTime() - req.t.getTime()) / 1000)
    );
    const reachableTaxis = reachablePoints.reduce((arr: readonly TaxiStatus[], elem) => {
      const elemIdx = MapUtils.getPointIdx(elem);
      const taxis = GenericCalculation.reachableTaxis(
        elemIdx.taxis,
        elem,
        Math.floor(req.wp.l.getTime() / 1000) - MapUtils.secondsToMoveBetween(elem, req.o)
      );
      return arr.concat(taxis);
    }, []);
    return reachableTaxis;
  },
};

const DualSideSearching: TaxisSearching = {
  candidateTaxis: (req: RideRequest) => {
    const originPointIdx = MapUtils.getPointIdx(req.o);
    const destPointIdx = MapUtils.getPointIdx(req.d);

    const originReachablePoints = GenericCalculation.reachablePoints(
      originPointIdx.temporally_ordered_points,
      req.o,
      Math.floor((req.wp.l.getTime() - req.t.getTime()) / 1000)
    );
    const destReachablePoints = GenericCalculation.reachablePoints(
      destPointIdx.temporally_ordered_points,
      req.d,
      Math.floor((req.wd.l.getTime() - req.t.getTime()) / 1000)
    );

    const sortedOP = GenericCalculation.spatiallySortedPoints(originReachablePoints, req.o);
    const sortedDP = GenericCalculation.spatiallySortedPoints(destReachablePoints, req.d);

    const originSet = new Set<TaxiStatus>();
    const destSet = new Set<TaxiStatus>();

    const noTurns = Math.max(sortedOP.length, sortedDP.length);
    // eslint-disable-next-line functional/no-let
    let reachableTaxis: readonly TaxiStatus[] = [];
    Array(noTurns).every((_, i) => {
      if (i < sortedOP.length) {
        const elemIdx = MapUtils.getPointIdx(sortedOP[i]);
        const taxis = GenericCalculation.reachableTaxis(
          elemIdx.taxis,
          req.o,
          Math.floor(req.wp.l.getTime() / 1000) - MapUtils.secondsToMoveBetween(elemIdx.p, req.o)
        );
        taxis.forEach((taxi) => originSet.add(taxi));
      }
      if (i < sortedDP.length) {
        const elemIdx = MapUtils.getPointIdx(sortedDP[i]);
        const taxis = GenericCalculation.reachableTaxis(
          elemIdx.taxis,
          req.o,
          Math.floor(req.wd.l.getTime() / 1000) - MapUtils.secondsToMoveBetween(elemIdx.p, req.d)
        );
        taxis.forEach((taxi) => destSet.add(taxi));
      }

      const resultSet = GenericCalculation.setsIntersection(originSet, destSet);
      if (resultSet.size === 0) return true;
      reachableTaxis = Array.from(resultSet);
      return false;
    });

    return reachableTaxis;
  },
};




/**
 * Application components:
 * - TaxisSearching: either SingleSide or DualSide
 * - Scheduling: either Immediate or Lazy Shortest Path Calculation, either Best Fit or First Fit
 */
