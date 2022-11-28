type Point = {
  readonly x: number;
  readonly y: number;
};

type TimeRange = {
  readonly e: Date;
  readonly l: Date;
};

type RideRequest = {
  readonly t: Date;
  readonly o: Point;
  readonly d: Point;
  readonly wp: TimeRange;
  readonly wd: TimeRange;
};

type ScheduleElement = {
  readonly point: Point;
  readonly request_id: number;
  readonly is_o: boolean;
};

type Schedule = readonly ScheduleElement[];

type TaxiStatus = {
  readonly s: Schedule;
  readonly l: Point;
};

type PointIndex = {
  readonly p: Point;
  readonly temporally_ordered_points: readonly Point[];
  readonly spatially_ordered_points: readonly Point[];
  readonly taxis: readonly TaxiStatus[];
};

enum TaxiEvents {
  MOVE = 'taxi.move',
}

enum GridEvents {
  TAXI_LEAVE = 'grid.taxi-leave',
}

const getPointIdx = (p: Point): PointIndex => {
  return {
    p: p,
    temporally_ordered_points: [],
    spatially_ordered_points: [],
    taxis: [],
  };
};

const distanceBetween = (origin: Point, destination: Point): number => {
  // TODO: using the pre-calculate grid distance matrix
  return 0;
};

const secondsToMoveBetween = (origin: Point, destination: Point): number => {
  // TODO: using the pre-calculate grid distance matrix
  return 0;
};

enum TaxiSearchingStrategy {
  SINGLE_SIDE = 'single-side',
  DUAL_SIDE = 'dual-side',
}

type TaxisSearching = {
  readonly candidateTaxis: (req: RideRequest) => readonly TaxiStatus[];
};

type InsertionChecking = {
  readonly isFeasible: (req: RideRequest, taxi: TaxiStatus, insertionPos: number, t: Date) => boolean;
};

const SingleSideSearching: TaxisSearching = {
  /**
   * @returns taxis which can reach origin point in time (req.wp.l)
   */
  candidateTaxis: (req: RideRequest) => {
    const originPointIdx = getPointIdx(req.o);

    const reachablePoints = GenericCalculation.reachablePoints(
      originPointIdx.temporally_ordered_points,
      req.o,
      Math.floor((req.wp.l.getTime() - req.t.getTime()) / 1000)
    );
    const reachableTaxis = reachablePoints.reduce((arr: readonly TaxiStatus[], elem) => {
      const elemIdx = getPointIdx(elem);
      const taxis = GenericCalculation.reachableTaxis(
        elemIdx.taxis,
        elem,
        Math.floor(req.wp.l.getTime() / 1000) - secondsToMoveBetween(elem, req.o)
      );
      return arr.concat(taxis);
    }, []);
    return reachableTaxis;
  },
};

const DualSideSearching: TaxisSearching = {
  candidateTaxis: (req: RideRequest) => {
    const originPointIdx = getPointIdx(req.o);
    const destPointIdx = getPointIdx(req.d);

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
        const elemIdx = getPointIdx(sortedOP[i]);
        const taxis = GenericCalculation.reachableTaxis(
          elemIdx.taxis,
          req.o,
          Math.floor(req.wp.l.getTime() / 1000) - secondsToMoveBetween(elemIdx.p, req.o)
        );
        taxis.forEach((taxi) => originSet.add(taxi));
      }
      if (i < sortedDP.length) {
        const elemIdx = getPointIdx(sortedDP[i]);
        const taxis = GenericCalculation.reachableTaxis(
          elemIdx.taxis,
          req.o,
          Math.floor(req.wd.l.getTime() / 1000) - secondsToMoveBetween(elemIdx.p, req.d)
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

const InsertionCheckingVer1: InsertionChecking = {
  isFeasible: (req: RideRequest, taxi: TaxiStatus, insertionPos: number, t: Date) => {
    // TODO:  impl
    return false;
  },
};

type Comparator<T> = (t1: T, t2: T) => boolean;

const GenericCalculation = {
  /**
   * @param candidates points, sorted in ascending order of time reaching target
   */
  reachablePoints: (candidates: readonly Point[], target: Point, allowedSeconds: number) => {
    const NOT_FOUND = -1;
    const go = (lo: number, hi: number): number => {
      const mid = Math.floor((lo + hi) / 2);
      if (secondsToMoveBetween(candidates[mid], target) <= allowedSeconds) {
        return lo + 1 <= hi ? go(lo + 1, hi) : mid;
      } else {
        return lo <= hi - 1 ? go(lo, hi - 1) : NOT_FOUND;
      }
    };
    const idx = go(0, candidates.length - 1);
    return idx !== NOT_FOUND ? candidates.slice(0, idx + 1) : [];
  },
  /**
   * @param candidates taxis, sorted in ascending order of time reaching target
   */
  reachableTaxis: (candidates: readonly TaxiStatus[], target: Point, allowedSeconds: number) => {
    const NOT_FOUND = -1;
    const reachable = (taxi: TaxiStatus, target: Point, allowedSeconds: number) => {
      return secondsToMoveBetween(taxi.l, target) <= allowedSeconds;
    };
    const go = (lo: number, hi: number): number => {
      const mid = Math.floor((lo + hi) / 2);
      if (reachable(candidates[mid], target, allowedSeconds)) {
        return lo + 1 <= hi ? go(lo + 1, hi) : mid;
      } else {
        return lo <= hi - 1 ? go(lo, hi - 1) : NOT_FOUND;
      }
    };
    const idx = go(0, candidates.length - 1);
    return idx !== NOT_FOUND ? candidates.slice(0, idx + 1) : [];
  },
  spatiallySortedPoints: (points: readonly Point[], target: Point): readonly Point[] => {
    const merge = <T>(firstArr: readonly T[], secondArr: readonly T[], comparator: Comparator<T>) => {
      // eslint-disable-next-line functional/prefer-readonly-type
      const mergedArr: T[] = [];
      // eslint-disable-next-line functional/no-let
      let i = 0;
      // eslint-disable-next-line functional/no-let
      let j = 0;
      // eslint-disable-next-line functional/no-loop-statement
      while (i < firstArr.length && j < secondArr.length) {
        if (comparator(firstArr[i], secondArr[j]) === true) {
          // eslint-disable-next-line functional/immutable-data
          mergedArr.push(firstArr[i]);
          i += 1;
        } else {
          // eslint-disable-next-line functional/immutable-data
          mergedArr.push(secondArr[j]);
          j += 1;
        }
      }
      return mergedArr.concat(firstArr.slice(i)).concat(secondArr.slice(j));
    };
    const mergeSort = <T>(unsortedArr: readonly T[], comparator: Comparator<T>) => {
      if (unsortedArr.length <= 1) return unsortedArr;
      const mid = Math.floor(unsortedArr.length / 2);
      return merge(unsortedArr.slice(0, mid), unsortedArr.slice(mid), comparator);
    };

    const comparison = (p1: Point, p2: Point) => {
      return distanceBetween(p1, target) < distanceBetween(p2, target);
    };
    return mergeSort(points, comparison);
  },

  setsIntersection: <T>(firstSet: ReadonlySet<T>, secondSet: ReadonlySet<T>): ReadonlySet<T> => {
    return new Set([...firstSet].filter((elem) => secondSet.has(elem)));
  },
};

/**
 * Application components:
 * - TaxisSearching: either SingleSide or DualSide
 * - Scheduling: either Immediate or Lazy Shortest Path Calculation, either Best Fit or First Fit
 */
