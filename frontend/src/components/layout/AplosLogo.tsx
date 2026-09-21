import React from 'react';

type AplosLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  showBackground?: boolean;
  taglineColor?: string;
  className?: string;
  align?: 'center' | 'start';
};

export default function AplosLogo({
  size = 'md',
  showTagline = true,
  showBackground = true,
  taglineColor = '#fff',
  className,
  align = 'center'
}: AplosLogoProps) {
  const sizes = {
    sm: {
      brace: 'clamp(14px, 4vw, 18px)',
      aplos: 'clamp(14px, 4vw, 18px)',
      tagline: 'clamp(6px, 2vw, 11px)'
    },
    md: {
      brace: 'clamp(18px, 6vw, 25px)',
      aplos: 'clamp(18px, 6vw, 25px)',
      tagline: 'clamp(6px, 3vw, 16px)'
    },
    lg: {
      brace: 'clamp(20px, 5vw, 28px)',
      aplos: 'clamp(20px, 5vw, 28px)',
      tagline: 'clamp(8px, 2vw, 14px)'
    }
  }[size];

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: align,
      textAlign: align,
      backgroundColor: showBackground ? '#0f172a' : 'transparent',
      padding: '12px 16px',
      borderRadius: '8px'
    },
    logoText: {
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: align
    },
    brace: {
      fontSize: sizes.brace,
      fontWeight: 'bold',
      color: '#1d9bf0'
    },
    aplos: {
      fontSize: sizes.aplos,
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
      color: '#e6782f',
      letterSpacing: '2px'
    },
    tagline: {
      fontSize: sizes.tagline,
      fontWeight: 300,
      color: taglineColor,
      margin: 0
    }
  };

  return (
    <div style={styles.container} className={className}>
      <div style={styles.logoText}>
        <span style={styles.brace}>{'{'}</span>
        <span style={styles.aplos}>APLÓS</span>
        <span style={styles.brace}>{'}'}</span>
      </div>
      {showTagline ? <p style={styles.tagline}>Let’s keep it simple.</p> : null}
    </div>
  );
}