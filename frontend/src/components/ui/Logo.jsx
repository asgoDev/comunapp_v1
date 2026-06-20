export const Logo = ({ inverted = false }) => {
    const colorA = inverted ? 'primary' : 'surface'
    const colorB = inverted ? 'surface' : 'primary'
    const colorC = '[#FFC907]'
    return (
        <h1 className="text-5xl text-center mb-2">
            <span className={`font-['Orbitron'] text-${colorA} font-black`}>comun</span>
            <span className={`font-['Bungee'] bg-${colorA} text-${colorB} px-1 rounded-lg`}>APP</span>
        </h1>
    )
}