export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-center flex flex-col gap-8">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-glow">
          ODINVENTARIO
        </h1>
        <p className="text-xl text-muted text-center max-w-2xl">
          El núcleo central de gestión. Sube tus archivos Excel, Word o PDF y la inteligencia artificial se encargará de categorizar cada componente.
        </p>

        <div className="bg-surface border border-slate-700 rounded-xl p-8 shadow-2xl w-full max-w-lg mt-8 transition-transform hover:scale-105">
          <h2 className="text-2xl font-bold mb-4 text-text">Carga Masiva</h2>
          <div className="border-2 border-dashed border-primary/50 rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-slate-800/50 transition-colors">
            <svg className="w-12 h-12 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-muted">Arrastra tu documento aquí o haz clic para seleccionar</p>
          </div>
        </div>
      </div>
    </main>
  );
}
