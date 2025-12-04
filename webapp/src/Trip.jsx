import React from "react";
import Leg from "./Leg";

export default function Trip({ trip, onlyTrains }) {
  const totalDuration =
    trip.actualDurationInMinutes || trip.plannedDurationInMinutes;
  const firstLeg = trip.legs[0];
  const lastLeg = trip.legs[trip.legs.length - 1];
  const departureTime = new Date(
    firstLeg?.actualDeparture || firstLeg?.plannedDeparture,
  );
  const arrivalTime = new Date(
    lastLeg?.actualArrival || lastLeg?.plannedArrival,
  );

  const filteredLegs = onlyTrains
    ? trip.legs.filter(
        (leg) =>
          leg.product &&
          (leg.product.includes("Sprinter") ||
            leg.product.includes("Intercity")),
      )
    : trip.legs;

  return (
    <div className="trip-card">
      <div className="trip-header">
        <span>
          {departureTime.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}{" "}
        </span>
        <span className="trip-duration">
          {totalDuration} min | {trip.transfers} overstap
          {trip.transfers !== 1 ? "pen" : ""}
        </span>
        <span>
          {arrivalTime.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>

      <div className="legs-container">
        {filteredLegs.map((leg, legIdx) => (
          <Leg
            key={legIdx}
            leg={leg}
            isFirstLeg={legIdx === 0}
            isLastLeg={legIdx === filteredLegs.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
