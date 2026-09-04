function Background3D() {
  return (
    <div className="bg-3d" aria-hidden="true">
      <div className="bg-3d__scene">
        <div className="bg-3d__plane bg-3d__plane--1" />
        <div className="bg-3d__plane bg-3d__plane--2" />
        <div className="bg-3d__plane bg-3d__plane--3" />
        <div className="bg-3d__grid" />
        <div className="bg-3d__orb bg-3d__orb--1" />
        <div className="bg-3d__orb bg-3d__orb--2" />
      </div>
    </div>
  );
}

export default Background3D;
