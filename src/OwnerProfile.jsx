import useProfileDashboard from "./useProfileDashboard.js";
import ProfileLedger from "./ProfileLedger.jsx";
import PublicProfileControls from "./PublicProfileControls.jsx";
import Stats from "./Stats.jsx";

const emptyProfile = {
  handle: null,
  run_count: 0,
  average_wpm: null,
  average_accuracy: null,
  recorded_typing_seconds: null,
  personal_bests: [],
};

export default function OwnerProfile({
  user,
  ownerProfile,
  onProfileChange,
  onBack,
  onRace,
  freshRun,
}) {
  const { state, retry } = useProfileDashboard(null, user.id, freshRun);
  const profile = state.profile === null ? emptyProfile : state.profile;

  const controls = (
    <PublicProfileControls user={user} onProfileChange={onProfileChange} />
  );
  const handle = ownerProfile?.handle || state.profile?.handle;

  return (
    <div className="owner-profile">
      <div className="page-heading profile-masthead">
        <div>
          <p className="profile-kicker">KEYSMASH / Performance ledger</p>
          <h1 tabIndex={-1}>{handle ? `@${handle}` : "Your profile"}</h1>
        </div>
        <button className="brutal-btn" onClick={onBack}>
          Start typing
        </button>
      </div>
      <ProfileLedger profile={profile} onRace={onRace}>
        {state.loading ? (
          <p className="state-panel" role="status">
            Loading your profile...
          </p>
        ) : state.error ? (
          <section className="state-panel" role="alert">
            <h2>Profile could not load.</h2>
            <p>Your saved history is available below.</p>
            <button className="brutal-btn" onClick={retry}>
              Retry profile
            </button>
          </section>
        ) : null}
        {controls}
      </ProfileLedger>
      <Stats
        user={user}
        onBack={onBack}
        freshRun={freshRun}
        cloudModes={(profile.personal_bests || []).map((record) => record.mode)}
        embedded
      />
    </div>
  );
}
