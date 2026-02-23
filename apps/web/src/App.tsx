import './index.css';

function App() {
  return (
    <div className="app-container">
      {/* Left Panel - Collection Box */}
      <div className="left-panel pixel-panel">
        <div className="panel-title">LIBRARY</div>
        <div className="game-list">
          {['Pokemon Red', 'Super Mario Land', 'Tetris', 'Kirby\'s Dream Land', 'Donkey Kong', 'Zelda: Link\'s Awakening', 'Metroid II', 'Wario Land'].map((game, i) => (
            <div className="game-item" key={i}>
              <div className="game-icon"></div>
              <div style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>{game}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Panel - The Retro Game Boy */}
      <div className="center-panel">
        <div className="gameboy">
          <div className="gb-top">
            <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold' }}>
              ◀ COMM
            </span>
          </div>

          <div className="gb-screen-container">
            <div className="gb-battery-indicator">
              <div className="gb-battery"></div>
              <div className="gb-battery-text">BATTERY</div>
            </div>

            <div className="gb-screen">
              <div className="screen-text">
                INSERT<br />CARTRIDGE
              </div>
              <div style={{ fontSize: '0.6rem', marginTop: '25px', opacity: 0.8 }}>(Drop file here)</div>
            </div>
          </div>

          <div className="gb-controls">
            <div className="gb-dpad">
              <div className="dpad-part dpad-up"></div>
              <div className="dpad-part dpad-down"></div>
              <div className="dpad-part dpad-left"></div>
              <div className="dpad-part dpad-right"></div>
              <div className="dpad-part dpad-center">
                <div style={{ width: '10px', height: '10px', background: 'rgba(0,0,0,0.2)', margin: '15px auto', borderRadius: '50%' }}></div>
              </div>
            </div>

            <div className="gb-action-buttons">
              <div className="gb-btn-b"><span style={{ position: 'absolute', bottom: '-20px', right: '-10px', fontSize: '12px', color: '#000' }}>B</span></div>
              <div className="gb-btn-a"><span style={{ position: 'absolute', bottom: '-20px', right: '-10px', fontSize: '12px', color: '#000' }}>A</span></div>
            </div>

            <div className="gb-select-start">
              <div className="gb-pill-btn-container">
                <div className="gb-pill-btn"></div>
                <div className="gb-pill-btn-label">SELECT</div>
              </div>
              <div className="gb-pill-btn-container">
                <div className="gb-pill-btn"></div>
                <div className="gb-pill-btn-label">START</div>
              </div>
            </div>

            <div className="gb-speaker">
              <div className="speaker-slit"></div>
              <div className="speaker-slit"></div>
              <div className="speaker-slit"></div>
              <div className="speaker-slit"></div>
              <div className="speaker-slit"></div>
              <div className="speaker-slit"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - System Information */}
      <div className="right-panel pixel-panel">
        <div className="panel-title">SYS INFO</div>
        <div className="info-stats">
          <div className="stat-box">
            <div style={{ color: '#aaa', marginBottom: '8px' }}>EMULATOR:</div>
            <div>mGBA (WASM)</div>
          </div>
          <div className="stat-box">
            <div style={{ color: '#aaa', marginBottom: '8px' }}>RAM USAGE:</div>
            <div>
              [||||||----] 60%
            </div>
          </div>
          <div className="stat-box">
            <div style={{ color: '#aaa', marginBottom: '8px' }}>STORAGE (OPFS):</div>
            <div>120 MB / 4 GB</div>
          </div>
          <div className="stat-box">
            <div style={{ color: '#aaa', marginBottom: '8px' }}>ROM LOADED:</div>
            <div>NONE (0MB)</div>
          </div>
          <div className="stat-box">
            <div style={{ color: '#aaa', marginBottom: '8px' }}>PWA MODE:</div>
            <div style={{ color: '#0f0' }}>READY ✦</div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;
