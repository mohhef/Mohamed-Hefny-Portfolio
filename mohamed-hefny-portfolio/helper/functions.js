export const formatDate = (date) =>{
    const given_date = new Date(date);
    return(`${given_date.getFullYear()}/${given_date.getMonth()}`);
}