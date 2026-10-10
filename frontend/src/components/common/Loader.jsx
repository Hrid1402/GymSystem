import '../../styles/loader.css';

export default function Loader({ text = 'Cargando...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="loader-overlay">
        <div className="spinner"></div>
        {text && <p className="loader-text">{text}</p>}
      </div>
    );
  }

  return (
    <div className="loader-container">
      <div className="spinner"></div>
      {text && <span className="loader-text">{text}</span>}
    </div>
  );
}
