type Station = {
  stationName: string,
  stationCode: string,
  firstIndex?: number,
  biggestChunk?: number
}

class FromAndToStation {
  fromStation: Station;
  toStation: Station;
  didYouMean?: {
    from: Station[],
    to: Station[]
  }
  constructor(fromStation?: Station, toStation?: Station) {
    this.fromStation = fromStation;
    this.toStation = toStation;
  }
}

type NrService = any;

type DepartureObject = {
  fromStation?: Station,
  toStation?: Station,
  trainServices?: NrService[],
  busServices?: NrService[],
  nrccMessages?: [string]
}

type ErrorResponse = {
  pageTitle: string,
  errorMessage: string
}

type DepartureResponse = {
  departureObject: DepartureObject,
  pageTitle: string,
  fromStation: string,
  toStation: string
}

type TrntxtService = any;

type ArrivalAndDepartureTimes = {
  eta: string,
  etd: string,
  sta: string,
  std: string
}

type ArrivalTime = {
  sta?: string,
  eta?: string,
  arrivalStation?: string,
  correctStation?: boolean
}

export {
  Station,
  FromAndToStation,
  NrService,
  DepartureObject,
  ErrorResponse,
  DepartureResponse,
  TrntxtService,
  ArrivalAndDepartureTimes,
  ArrivalTime
}