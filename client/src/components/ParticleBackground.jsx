import { Particles } from '@tsparticles/react';

const ParticleBackground = () => (
  <Particles
    id="tsparticles"
    style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}
    options={{
      background: { color: { value: '#2d0140' } },
      fpsLimit: 60,
      particles: {
        number: { value: 60, density: { enable: true, value_area: 800 } },
        color: { value: ['#a259ff', '#ff6a88', '#43e0ff', '#fff'] },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: true },
        size: { value: 4, random: { enable: true, minimumValue: 1 } },
        move: {
          enable: true,
          speed: 1.2,
          direction: 'none',
          random: false,
          straight: false,
          outModes: { default: 'out' },
          attract: { enable: false }
        },
        links: {
          enable: true,
          distance: 150,
          color: '#fff',
          opacity: 0.1,
          width: 1
        }
      },
      detectRetina: true
    }}
  />
);

export default ParticleBackground; 