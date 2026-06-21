export const Logo = ({ inverted = false, size = 'text-5xl' }) => {
    const colorA = inverted ? 'primary' : '[#fff]'
    const colorB = inverted ? '[#fff]' : 'primary'
    const colorC = '[#FFC907]'
    return (
        <h1 className={`${size} text-center`}>
            <span className={`font-['Orbitron'] text-${colorA} font-black`}>comun</span>
            <span className={`font-['Bungee'] bg-${colorA} text-${colorB} px-1 rounded-lg`}>APP</span>
        </h1>
    )
}