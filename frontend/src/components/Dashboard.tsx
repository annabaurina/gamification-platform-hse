import { useState, useEffect } from 'react';
import TopStudents from './TopStudents';
import { getProgress } from '../api';

function Dashboard() {
  const [progress, setProgress] = useState({
    coins: 0,
    maxCoins: 100,
    percent: 0,
    level: 'Новичок',
    nextLevel: 'Академик',
    coinsToNextLevel: 0,
    bestStudent: 'Загрузка...',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const data = await getProgress();
        setProgress(data);
      } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const activities = [
    { id: 1, icon: 'fa-star', color: '#0E2C6B', text: 'Оценка 5 по Математике', coins: '+5' },
    { id: 2, icon: 'fa-check-circle', color: '#00BFA5', text: 'Посещение пары', coins: '+1' },
    { id: 3, icon: 'fa-fire', color: '#f5a623', text: 'Участие в хакатоне', coins: '+10' },
  ];

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 48 }}>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Новичок':
        return 'status1.png';
      case 'Академик':
        return 'fa-graduation-cap';
      case 'Победитель':
        return 'fa-trophy';
      default:
        return 'fa-graduation-cap';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Новичок':
        return '#4CAF50';
      case 'Академик':
        return '#0E2C6B';
      case 'Победитель':
        return '#F5A623';
      default:
        return '#0E2C6B';
    }
  };

  return (
    <div className="container">
      <div className="banner">
        <div>
          <h1>Привет, Надя!</h1>
          <p>
            Твой уровень: <i className={`fa-solid ${getLevelIcon(progress.level)}`} style={{ color: getLevelColor(progress.level) }}></i> {progress.level}
          </p>
        </div>
        <div style={styles.bannerCoins}>
          <span style={styles.bannerCoinsText}>{progress.coins}</span>
          <img src="/coin-logo.png" alt="Coin" style={styles.bannerCoinsImg} />
        </div>
      </div>

      <div className="row">
        <div className="card">
          <div className="card-title">
            <i className="fa-solid fa-chart-line"></i>
            Мой прогресс
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 14,
            color: '#666'
          }}>
            <span>Лучший в группе: <strong>{progress.bestStudent}</strong> — {progress.maxCoins} коинов</span>
            <span>Ты: <strong>{progress.coins}</strong> коинов ({progress.percent}%)</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(progress.percent, 100)}%` }}></div>
          </div>
          <div className="progress-labels">
            <span>{progress.coins} коинов</span>
            <span>
              {progress.nextLevel === 'Максимум' ? (
                <><i className="fa-solid fa-trophy" style={{ color: '#F5A623' }}></i> Победитель</>
              ) : (
                <><i className={`fa-solid ${getLevelIcon(progress.nextLevel)}`} style={{ color: getLevelColor(progress.nextLevel) }}></i> {progress.nextLevel}</>
              )}
            </span>
          </div>
          {progress.nextLevel !== 'Максимум' && progress.coinsToNextLevel > 0 && (
            <div style={{ marginTop: 8, fontSize: 14, color: '#888' }}>
              До уровня <i className={`fa-solid ${getLevelIcon(progress.nextLevel)}`} style={{ color: getLevelColor(progress.nextLevel) }}></i> {progress.nextLevel}: <strong>{progress.coinsToNextLevel}</strong> коинов
            </div>
          )}
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="card-title" style={{ justifyContent: 'center' }}>
            <i className="fa-solid fa-fire" style={{ color: '#f5a623' }}></i>
            Уровень
          </div>
          <div style={{ fontSize: 48, margin: '8px 0' }}>
            <i
              className={`fa-solid ${getLevelIcon(progress.level)}`}
              style={{ color: getLevelColor(progress.level) }}
            ></i>
          </div>
          <h3 style={{ margin: 0 }}>{progress.level}</h3>
          <span style={{ color: '#888', fontSize: 14 }}>
            {progress.percent < 33 ? '🌱 Начало пути' : progress.percent < 66 ? '📚 Активный' : '🏆 Лидер!'}
          </span>
        </div>
      </div>

      <TopStudents />

      <div className="card">
        <div className="card-title">
          <i className="fa-solid fa-clock-rotate-left"></i>
          Последние действия
        </div>
        {activities.map((item) => (
          <div className="action-item" key={item.id}>
            <div className="icon">
              <i className={`fa-solid ${item.icon}`} style={{ color: item.color }}></i>
            </div>
            <span className="text">{item.text}</span>
            <span className="coins">{item.coins} HSE-Коин</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;

const styles = {
  bannerCoins: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  bannerCoinsText: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1,
  },
  bannerCoinsImg: {
    height: 40,
    width: 'auto',
    display: 'block',
  },
};