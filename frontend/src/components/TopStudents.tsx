function TopStudents() {
  const students = [
    { name: 'Иванов И.', coins: 540, avatar: 'https://avatar.iran.liara.run/public/1', place: 1, class: 'gold' },
    { name: 'Петрова А.', coins: 480, avatar: 'https://avatar.iran.liara.run/public/2', place: 2, class: 'silver' },
    { name: 'Сидоров С.', coins: 420, avatar: 'https://avatar.iran.liara.run/public/3', place: 3, class: 'bronze' },
  ];

  const icons = ['👑', '🥈', '🥉'];

  return (
    <div className="card">
      <div className="card-title">
        <i className="fa-solid fa-trophy"></i>
        Топ-3 студентов группы
      </div>
      <div className="top-grid">
        {students.map((s, i) => (
          <div className={`top-card ${s.class}`} key={i}>
            <div className="place-icon">{icons[i]}</div>
            <img src={s.avatar} alt={s.name} />
            <div className="name">{s.name}</div>
            <div className="coins">
              <i className="fa-solid fa-coins"></i> {s.coins}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopStudents;