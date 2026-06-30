import {
  Heart,
  Skull,
  Trash2,
  Minus,
  Plus,
  Sparkles,
  Shield
} from "lucide-react";

import './PlayerCard.css';

export default function PlayerCard({
  player,
  roleInfo,
  gameStarted,
  FAZIONI_POSSIBILI,

  updateField,
  incrementVote,
  decrementVote,
  toggleStatus,
  removePlayer
}) {
  const isDead = player.status === "morto";

  let currentAura = roleInfo.aura;

  if (player.fazione === "Vampiro")
    currentAura = "Oscura";

  if (
    player.fazione === "Lupi del Branco" &&
    roleInfo.fazione !== "Lupi del Branco"
  )
    currentAura = "Oscura";

  return (
    <div
      className={`player-card ${
        isDead
          ? "dead"
          : player.isBallot
          ? "ballot"
          : "alive"
      }`}
    >
      {/* ================= HEADER ================= */}

      <div className="player-card-header">
        <div>
          <h2>{player.name}</h2>
        </div>

        <span
          className={`status-badge ${
            isDead ? "status-morto" : "status-vivo"
          }`}
        >
          {isDead ? "MORTO" : "VIVO"}
        </span>
      </div>

      {/* ================= GRID ================= */}

      <div className="player-grid">

        <div className="info-box">
          <label>Ruolo</label>
          <strong>{player.role}</strong>
        </div>

        <div className="info-box">
          <label>Mistico</label>

          <strong
            style={{
              color:
                roleInfo.misticismo === "Sì"
                  ? "#9333ea"
                  : "#888"
            }}
          >
            <Sparkles size={15} />

            {roleInfo.misticismo || "No"}
          </strong>
        </div>

        <div className="info-box">
          <label>Fazione</label>

          <select
            className="dark-input"
            value={player.fazione}
            onChange={(e) =>
              updateField(
                player.id,
                "fazione",
                e.target.value
              )
            }
          >
            {FAZIONI_POSSIBILI.map((f) => (
              <option
                key={f}
                value={f}
              >
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="info-box">
          <label>Aura</label>

          <strong>{currentAura}</strong>
        </div>
      </div>

      {/* ================= NOTES ================= */}

      <div className="info-box full">
        <label>Notes</label>

        <input
          className="dark-input"
          defaultValue={player.notes}
          placeholder="..."
          onBlur={(e) =>
            updateField(
              player.id,
              "notes",
              e.target.value
            )
          }
        />
      </div>

      {/* ================= VOTES ================= */}

      {!isDead && (
        <div className="vote-card">

          <label>Votes</label>

          <div className="vote-controls">

            <button
              className="action-btn"
              onClick={() =>
                decrementVote(
                  player.id,
                  player.votes,
                  "votes"
                )
              }
            >
              <Minus size={18} />
            </button>

            <span className="vote-number">
              {player.votes || 0}
            </span>

            <button
              className="action-btn"
              onClick={() =>
                incrementVote(
                  player.id,
                  player.votes,
                  "votes"
                )
              }
            >
              <Plus size={18} />
            </button>

          </div>
        </div>
      )}

      {/* ================= BALLOT ================= */}

      {!isDead && (
        <div className="ballot-card">

          <label>

            <input
              type="checkbox"
              checked={player.isBallot || false}
              onChange={(e) =>
                updateField(
                  player.id,
                  "isBallot",
                  e.target.checked
                )
              }
            />

            Ballot Candidate

          </label>

          {player.isBallot && (

            <div className="vote-controls">

              <button
                className="action-btn"
                onClick={() =>
                  decrementVote(
                    player.id,
                    player.ballotVotes,
                    "ballotVotes"
                  )
                }
              >
                <Minus size={18} />
              </button>

              <span className="vote-number ballot">
                {player.ballotVotes || 0}
              </span>

              <button
                className="action-btn"
                onClick={() =>
                  incrementVote(
                    player.id,
                    player.ballotVotes,
                    "ballotVotes"
                  )
                }
              >
                <Plus size={18} />
              </button>

            </div>
          )}
        </div>
      )}

      {/* ================= ACTIONS ================= */}

      <div className="player-actions">

        {gameStarted ? (

          <button
            className={ !isDead ? "danger-btn" : "success-btn" }
            onClick={() =>
              toggleStatus(
                player.id,
                player.status
              )
            }
          >
            {isDead ? (
              <>
                <Heart size={18} />
                Revive
              </>
            ) : (
              <>
                <Skull size={18} />
                Kill
              </>
            )}
          </button>

        ) : (

          <button
            className="delete-btn"
            onClick={() =>
              removePlayer(player.id)
            }
          >
            <Trash2 size={18} />
            Remove
          </button>

        )}
      </div>
    </div>
  );
}