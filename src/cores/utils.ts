import { Point, PointIndex, TaxiStatus } from "./interfaces";

type Comparator<T> = (t1: T, t2: T) => boolean;

const MapUtils = {

  getPointIdx: (p: Point): PointIndex => {
  return {
    p: p,
    temporally_ordered_points: [],
    spatially_ordered_points: [],
    taxis: [],
  };
},

  distanceBetween: (origin: Point, destination: Point): number => {
  // TODO: using the pre-calculate grid distance matrix
  return 0;
},

  secondsToMoveBetween: (origin: Point, destination: Point): number => {
  // TODO: using the pre-calculate grid distance matrix
  return 0;
},
}

const GenericCalculation = {
  /**
   * @param candidates points, sorted in ascending order of time reaching target
   */
  reachablePoints: (candidates: readonly Point[], target: Point, allowedSeconds: number) => {
    const NOT_FOUND = -1;
    const go = (lo: number, hi: number): number => {
      const mid = Math.floor((lo + hi) / 2);
      if (MapUtils.secondsToMoveBetween(candidates[mid], target) <= allowedSeconds) {
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
      return MapUtils.secondsToMoveBetween(taxi.l, target) <= allowedSeconds;
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
      return MapUtils.distanceBetween(p1, target) < MapUtils.distanceBetween(p2, target);
    };
    return mergeSort(points, comparison);
  },

  setsIntersection: <T>(firstSet: ReadonlySet<T>, secondSet: ReadonlySet<T>): ReadonlySet<T> => {
    return new Set([...firstSet].filter((elem) => secondSet.has(elem)));
  },
};

export {
  MapUtils,
  GenericCalculation,
}
