import React, { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [onlyTrains] = useState(true);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  // Parse URL parameters for from/to stations
  const urlParams = new URLSearchParams(window.location.search);
  const fromStations = urlParams.get("from")?.split(",").filter(Boolean) || [];
  const toStations = urlParams.get("to")?.split(",").filter(Boolean) || [];

  async function fetchTrips() {
    if (fromStations.length === 0 || toStations.length === 0) return;

    setLoadingTrips(true);
    try {
      const allTrips = [];

      // Fetch trips for all combinations of from/to stations
      for (const fromStation of fromStations) {
        for (const toStation of toStations) {
          const res = await fetch(
            `${backendUrl}/trips?fromStation=${encodeURIComponent(fromStation)}&toStation=${encodeURIComponent(toStation)}`,
          );
          const result = await res.json();
          allTrips.push(...(result.trips || []));
        }
      }

      // Sort by departure time
      allTrips.sort((a, b) => {
        const timeA = new Date(
          a.legs[0]?.actualDeparture || a.legs[0]?.plannedDeparture,
        );
        const timeB = new Date(
          b.legs[0]?.actualDeparture || b.legs[0]?.plannedDeparture,
        );
        return timeA - timeB;
      });

      setTrips(allTrips);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Error fetching trips:", e);
      setTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  }

  useEffect(() => {
    fetchTrips();
  }, []);

  if (loadingTrips && trips.length === 0) {
    return (
      <div className="container">
        <div className="loading">Reizen laden...</div>
      </div>
    );
  }

  if (fromStations.length === 0 || toStations.length === 0) {
    return (
      <div className="container">
        <div className="error">
          <strong>Ontbrekende parameters</strong>
          <br />
          Gebruik: /?from=STATION1&to=STATION2
          <br />
          Of voor meerdere stations:
          /?from=STATION1,STATION2&to=STATION3,STATION4
          <br />
          Voorbeeld: /?from=KZ,ZD&to=ASA
        </div>
      </div>
    );
  }

  const routeDesc = `${fromStations.join(", ")} → ${toStations.join(", ")}`;

  return (
    <div className="container">
      <div className="header">
        {/* <div> */}
        {/*   <h1>NS Reisplanner</h1> */}
        {/*   <div className="route">{routeDesc}</div> */}
        {/* </div> */}
        {lastUpdated && (
          <div className="last-updated">
            Bijgewerkt:{" "}
            {lastUpdated.toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </div>
        )}
      </div>

      {trips.length === 0 && !loadingTrips ? (
        <div className="loading">Geen reizen gevonden</div>
      ) : (
        <div className="trips-section">
          {trips.map((trip, idx) => {
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
              <div key={trip.uid || idx} className="trip-card">
                <div className="trip-header">
                  <span>
                    {departureTime.toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}{" "}
                    →{" "}
                    {arrivalTime.toLocaleTimeString("nl-NL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                  <span className="trip-duration">
                    {totalDuration} min | {trip.transfers} overstap
                    {trip.transfers !== 1 ? "pen" : ""}
                  </span>
                </div>

                <div className="legs-container">
                  {filteredLegs.map((leg, legIdx) => {
                    const depTime = new Date(
                      leg.actualDeparture || leg.plannedDeparture,
                    );
                    const arrTime = new Date(
                      leg.actualArrival || leg.plannedArrival,
                    );
                    const delayed =
                      leg.actualDeparture &&
                      leg.plannedDeparture &&
                      new Date(leg.actualDeparture) >
                        new Date(leg.plannedDeparture);
                    const isLastLeg = legIdx === filteredLegs.length - 1;

                    return (
                      <div
                        key={legIdx}
                        className={`leg-row ${leg.cancelled ? "cancelled" : ""} ${!isLastLeg ? "with-separator" : ""}`}
                      >
                        <div className="leg-content">
                          {/* <div className="train-info"> */}
                          {/*   <span className="train-name">{leg.product || 'Lopen'}</span> */}
                          {/*   <span className="status-icon"> */}
                          {/*     {leg.cancelled ? '✕' : delayed ? '▲' : '✓'} */}
                          {/*   </span> */}
                          {/* </div> */}

                          <div className="time-cell dep-time">
                            {depTime.toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                            {delayed && (
                              <span className="delay-indicator">▲</span>
                            )}
                          </div>

                          <div className="stations-cell">
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
                            <div className="station-separator">→</div>
                            <div className="station-line">
                              <span className="station-name">
                                {leg.destination}
                              </span>
                              <span className="platform-info">
                                <span
                                  className={`platform-cell ${leg.arrivalPlatformChanged ? "changed" : ""}`}
                                >
                                  {leg.arrivalTrack || "—"}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="time-cell arr-time">
                            {arrTime.toLocaleTimeString("nl-NL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
