import BaseLayout from "@/components/layouts/BaseLayout"
import { useUser } from '@auth0/nextjs-auth0';
import { Button } from 'reactstrap'
import TimelineApi from '@/lib/api/timeline'
import BasePage from "@/components/BasePage"
import TimelineElement from "../../components/TimelineElement"


const Timeline = ({ timeline }) => {
    const { user, isLoading } = useUser();
    debugger
    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage header="Timeline" className="timeline-page">
                <TimelineElement timeline={timeline} user={user} >
                    {
                        user &&
                        <>
                            <Button className="mr-2" color="warning">Edit</Button>
                            <Button color="danger">Delete</Button>
                        </>
                    }
                </TimelineElement>
            </BasePage>
        </BaseLayout >
    )

}

export async function getStaticProps() {
    const json = await new TimelineApi().getAll();
    const timeline = json.data;
    return {
        props: { timeline }
    }
}

export default Timeline;