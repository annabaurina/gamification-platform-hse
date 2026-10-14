import Header from './components/Header';
import Dashboard from './components/Dashboard';
import './styles/global.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const user = {
    name: 'Надя',
    coins: 540,
  };

  return (
    <div>
      <Header user={user} />
      <Dashboard />
    </div>
  );
}

export default App;