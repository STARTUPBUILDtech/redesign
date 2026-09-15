export default function DesktopIntro() {
  return (
    <div className="desktop-content-wrap desktop-intro-wrap">
      <section className="intro">
        <div>
          <h1>Good morning, Amaka</h1>
          <p>What will you like to do?</p>
        </div>
        <div className="intro-actions">
          <button type="button" className="primary-button">
            <b className="btn-plus">＋</b> New Payment
          </button>
          <button type="button" className="secondary-button">
            Withdraw
          </button>
        </div>
      </section>
    </div>
  );
}
