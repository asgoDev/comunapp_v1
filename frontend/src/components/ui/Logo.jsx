export const Logo = ({ inverted = false, size = 'text-5xl' }) => {
    return (
        <h1 className={`${size} text-center`}>
            <span className={`font-['Orbitron'] font-black ${inverted ? 'text-primary' : 'text-white'}`}>
                comun
            </span>
            <span className={`font-['Bungee'] px-1 rounded-lg ${inverted ? 'bg-primary text-white' : 'bg-white text-primary'}`}>
                APP
            </span>
        </h1>
    )
}