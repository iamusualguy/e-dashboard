import React from "react";

export default function Leg({ leg, isLastLeg, isFirstLeg }) {
  const depTime = new Date(leg.actualDeparture || leg.plannedDeparture);
  const arrTime = new Date(leg.actualArrival || leg.plannedArrival);
  const delayed =
    leg.actualDeparture &&
    leg.plannedDeparture &&
    new Date(leg.actualDeparture) > new Date(leg.plannedDeparture);

  return (
    <div
      className={`leg-row ${leg.cancelled ? "cancelled" : ""} ${!isLastLeg ? "with-separator" : ""}`}
    >
      <div className="station-line">
        <span className="station-name">{leg.origin}</span>
        <span className="platform-info">
          <span
            className={`platform-cell ${leg.departurePlatformChanged ? "changed" : ""}`}
          >
            {leg.departureTrack || "—"}
          </span>
        </span>
      </div>
      <div className="leg-content">
        <div className="time-cell dep-time">
          {depTime.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
          {delayed && <span className="delay-indicator">▲</span>}
        </div>
        <div className="stations-cell"></div>
        <div className="time-cell arr-time">
          {arrTime.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>{" "}
      </div>{" "}
      <div className="station-line">
        <span className="station-name">{leg.destination}</span>
        <span className="platform-info">
          <span
            className={`platform-cell ${leg.arrivalPlatformChanged ? "changed" : ""}`}
          >
            {leg.arrivalTrack || "—"}
          </span>
        </span>
      </div>
    </div>
  );
}
