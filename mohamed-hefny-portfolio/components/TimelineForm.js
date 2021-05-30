import { useForm } from "react-hook-form";
import { useState, useEffect } from 'react';
import DatePicker from "react-datepicker"

const TimelineForm = ({ onSubmit, initialData = {} }) => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const { register, handleSubmit, setValue } = useForm({defaultValues: initialData});

    useEffect(() => {
        register('startDate');
        register('endDate');
    }, [register])

    useEffect(()=>{
        const {startDate, endDate} = initialData;
        if(startDate) {setStartDate(new Date(startDate))}
        if(endDate) {setEndDate(new Date(endDate))}
    },[initialData])
    const handleDateChange = (dateType, setDate) => {
        return (date) => {
            setValue(dateType, date);
            setDate(date);
        }
    }
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                    {...register("title")}
                    name="title"
                    type="text"
                    className="form-control"
                    id="title" />
            </div>

            <div className="form-group">
                <label htmlFor="company">Company</label>
                <input
                    {...register("company")}
                    name="company"
                    type="text"
                    className="form-control"
                    id="company" />
            </div>

            <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                    {...register("website")}
                    name="website"
                    type="text"
                    className="form-control"
                    id="website" />
            </div>

            <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                    {...register("location")}
                    name="location"
                    type="text"
                    className="form-control"
                    id="location" />
            </div>

            <div className="form-group">
                <label htmlFor="jobTitle">Job Title</label>
                <input
                    {...register("jobTitle")}
                    name="jobTitle"
                    type="text"
                    className="form-control"
                    id="jobTitle" />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    {...register("description")}
                    name="description"
                    rows="5"
                    type="text"
                    className="form-control"
                    id="description">
                </textarea>
            </div>

            <div className="form-group">
                <label htmlFor="buttonText">Button Text</label>
                <input
                    {...register("buttonText")}
                    name="buttonText"
                    rows="5"
                    type="text"
                    className="form-control"
                    id="buttonText"
                >
                </input>
            </div>

            <div className="form-group">
                <label htmlFor="type">Type</label>
                <input
                    {...register("type")}
                    name="type"
                    rows="5"
                    type="text"
                    className="form-control"
                    id="type"
                >
                </input>
            </div>

            <div className="form-group">
                <label htmlFor="startDate">Start Date</label>
                <div>
                    <DatePicker showYearDropdown selected={startDate} onChange={handleDateChange('startDate', setStartDate)} />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="endDate">End Date</label>
                <div>
                    <DatePicker
                        disabled={!endDate}
                        showYearDropdown
                        selected={endDate}
                        onChange={handleDateChange('endDate', setEndDate)} />
                </div>
            </div>
            <div className="form-group">
                {endDate &&
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {handleDateChange('endDate',setEndDate)(null)}}>
                        No End Date
                </button>
                }
                {!endDate &&
                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={
                            () => {handleDateChange('endDate',setEndDate)(new Date(new Date().setHours(0,0,0,0))) }}>
                        Set End Date
                </button>
                }
            </div>
            <button
                type="submit"
                className="btn btn-primary">Create
        </button>
        </form>
    )
}

export default TimelineForm;