import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import withAuth from '@/hoc/withAuth'
import { Row, Col } from 'reactstrap'
import { toast } from 'react-toastify';
import TimelineForm from "@/components/TimelineForm"
import {useCreateTimeline} from '@/actions/timeline'
import Redirect from '@/components/shared/redirect'

const TimelineNew = ({ user, isLoading }) => {

    const [createTimeline, {data, loading, error}] = useCreateTimeline();
    
    if(data){
        toast.success("Timeline has been added!", { autoClose: 2000 })
        return <Redirect to="/timeline"/>
    }
    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage header="Create Portfolio">
                <Row>
                    <Col md="8">
                        <TimelineForm onSubmit={createTimeline}/>
                        {error && <div className="alert alert-danger mt-2">{error}</div>}
                    </Col>
                </Row>
            </BasePage>
        </BaseLayout>
    )
}
export default withAuth(TimelineNew)('admin');
