export const formatName = (name, lastname) => {
    return `${name.capitalize()} ${lastname.capitalize()}`
}
export const formatBirthDate = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export const calculateAge = (dateInput) => {
    if (!dateInput) return '';
    const birthDate = new Date(dateInput);
    if (isNaN(birthDate.getTime())) return '';

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const birthYear = birthDate.getUTCFullYear();
    const birthMonth = birthDate.getUTCMonth();
    const birthDay = birthDate.getUTCDate();

    let age = todayYear - birthYear;
    const monthDiff = todayMonth - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && todayDay < birthDay)) {
        age--;
    }
    return age;
};