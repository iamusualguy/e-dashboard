import React, { useEffect, useState } from "react";
import "./App.css";
import Trip from "./Trip";

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

      // Filter out trips that have already departed or are cancelled
      const now = new Date();
      const futureTrips = allTrips.filter((trip) => {
        const departureTime = new Date(
          trip.legs[0]?.actualDeparture || trip.legs[0]?.plannedDeparture,
        );
        return departureTime > now && trip.status !== "CANCELLED";
      });

      // Sort by departure time
      futureTrips.sort((a, b) => {
        const timeA = new Date(
          a.legs[0]?.actualDeparture || a.legs[0]?.plannedDeparture,
        );
        const timeB = new Date(
          b.legs[0]?.actualDeparture || b.legs[0]?.plannedDeparture,
        );
        return timeA - timeB;
      });

      setTrips(futureTrips);
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
      {trips.length === 0 && !loadingTrips ? (
        <div className="loading">Geen reizen gevonden</div>
      ) : (
        <div className="trips-section">
          {trips.map((trip, idx) => (
            <Trip key={trip.uid || idx} trip={trip} onlyTrains={onlyTrains} />
          ))}
        </div>
      )}{" "}
      {lastUpdated && (
        <div className="last-updated">
          {lastUpdated.toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </div>
      )}
    </div>
  );
}
