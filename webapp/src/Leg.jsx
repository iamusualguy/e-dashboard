import React from "react";
import "./Leg.css";

export default function Leg({ leg, isLastLeg, isFirstLeg }) {
  const depTime = new Date(leg.actualDeparture || leg.plannedDeparture);
  const arrTime = new Date(leg.actualArrival || leg.plannedArrival);
  const delayed =
    leg.actualDeparture &&
    leg.plannedDeparture &&
    new Date(leg.actualDeparture) > new Date(leg.plannedDeparture);

  return (
    <div className={`leg-row ${leg.cancelled ? "cancelled" : ""}`}>
      <div className="station-line">
        <span className="station-name">{leg.origin}</span>
        {isFirstLeg ? null : (
          <span>
            {" "}
            {depTime.toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
            {delayed && <span className="delay-indicator">▲</span>}
          </span>
        )}
        <span className="platform-info">
          <span
            className={`platform-cell ${leg.departurePlatformChanged ? "changed" : ""}`}
          >
            {leg.departureTrack || "—"}
          </span>
        </span>
      </div>
      {isFirstLeg ? (
        <div className="time-cell dep-time">
          {depTime.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
          {delayed && <span className="delay-indicator">▲</span>}
        </div>
      ) : null}
      {/* "trip" */}
      {isLastLeg ? (
        <div className="time-cell arr-time">
          {arrTime.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>
      ) : null}
      <div className="leg-content"></div>
      <div className="station-line">
        <span className="station-name">{leg.destination}</span>
        {isLastLeg ? null : (
          <span>
            {arrTime.toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        )}
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
