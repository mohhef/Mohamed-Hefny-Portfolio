import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import withAuth from '@/hoc/withAuth'
import { Row, Col } from 'reactstrap'
import TimelineForm from "@/components/TimelineForm"
import {createTimeline} from '@/actions/timeline'

const TimelineNew = ({ user, isLoading }) => {

    const _createTimeline = (data) =>{
        createTimeline(data);
    }
    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage header="Create Portfolio">
                <Row>
                    <Col md="8">
                        <TimelineForm onSubmit={_createTimeline}/>
                    </Col>
                </Row>
            </BasePage>
        </BaseLayout>
    )
}
export default withAuth(TimelineNew)('admin');
