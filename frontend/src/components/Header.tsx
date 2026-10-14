function Header({ user }: { user: any }) {
  return (
    <header className="header">
      <div className="header-logo">
        <img
          src="/hse-logo.png"
          alt="Logo"
          style={{height: 40, width: 'auto'}}
        />
      </div>
      <div className="header-right">
        <div className="coins-badge">
          {user.coins}
          <img
          src="/coin-logo.png"
          alt="Coin"
          style={{height: 20, width: 'auto'}}
          />
          
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-bell" style={{ fontSize: 20, cursor: 'pointer' }}></i>
          <i className="fa-solid fa-user-circle" style={{ fontSize: 32, cursor: 'pointer', color: '#0E2C6B' }}></i>
        </div>
      </div>
    </header>
  );
}

export default Header;