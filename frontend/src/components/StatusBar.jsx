import './StatusBar.css'

/**
 * StatusBar Component
 *
 * Displays current connection status, user ID, and rate limit info
 * Provides feedback to the user about their session state
 *
 * @param {string} status - Current status message
 * @param {string} userId - Current user's unique ID
 * @param {boolean} isRateLimited - Whether user is currently rate limited
 */
function StatusBar({ status, userId, isRateLimited }) {
  return (
    <div className={`status-bar ${isRateLimited ? 'rate-limited' : ''}`}>
      <div className="status-item">
        <span className="status-label">Status:</span>
        <span className={`status-value ${isRateLimited ? 'error' : 'success'}`}>
          {status}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">User ID:</span>
        <span className="status-value user-id" title={userId}>
          {userId}
        </span>
      </div>

      {isRateLimited && (
        <div className="rate-limit-warning">
          ⚠️ Rate Limited: You can place 1 pixel every 5 seconds
        </div>
      )}
    </div>
  )
}

export default StatusBar
