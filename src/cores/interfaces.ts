export type Point = {
  readonly x: number;
  readonly y: number;
};

export type TimeRange = {
  readonly e: Date;
  readonly l: Date;
};

export type RideRequest = {
  readonly t: Date;
  readonly o: Point;
  readonly d: Point;
  readonly wp: TimeRange;
  readonly wd: TimeRange;
};

export type ScheduleElement = {
  readonly point: Point;
  readonly request_id: number;
  readonly is_o: boolean;
};

export type Schedule = readonly ScheduleElement[];

export type TaxiStatus = {
  readonly s: Schedule;
  readonly l: Point;
};

export type PointIndex = {
  readonly p: Point;
  readonly temporally_ordered_points: readonly Point[];
  readonly spatially_ordered_points: readonly Point[];
  readonly taxis: readonly TaxiStatus[];
};
