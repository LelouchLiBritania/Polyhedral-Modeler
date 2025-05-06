import { ExactMatrix } from './utils/exactMatrix';
import * as Utils from './utils/utils';

function isTopologicallyValid(geometricalController){

    let valid = true;

    let issue = "";

    //Check if the object has no borders 
    //(=> every half-edge has an opposite, which is not itself)

    for(let i=0; i<geometricalController.halfEdgeData.count; i++){
        let o = geometricalController.halfEdgeData.opposite(i)
        valid = o!=i && o!=null;
        if(!valid){
            break;
        }
    }

    if(!valid){
        issue = "borders exists";
    }

    //Check that there is no undifined data
    //--->Points
    if(valid){
        for(let i=0; i<geometricalController.pointData.count; i++){
            let he = geometricalController.pointData.heIndex[i];
            valid = he!=null;
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined point data";
        }
    }

    
    

    //--->half-edges
    if(valid){
        for(let i=0; i<geometricalController.halfEdgeData.count; i++){
            let p = geometricalController.halfEdgeData.pIndex[i];
            let o = geometricalController.halfEdgeData.oppIndex[i];
            let n = geometricalController.halfEdgeData.nextIndex[i];
            let f = geometricalController.halfEdgeData.fIndex[i];
            let e = geometricalController.halfEdgeData.eIndex[i];
            valid = (p!=null && o!=null && n!=null && f!=null && e!=null);
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined half-edge data";
        }
    }


    
    //--->edges
    if(valid){
        for(let i=0; i<geometricalController.edgeData.count; i++){
            let he = geometricalController.edgeData.heIndex[i];
            valid = he!=null;
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined edge data";
        }
    }



    //--->faces
    if(valid){
        for(let i=0; i<geometricalController.faceData.count; i++){
            let p  = geometricalController.faceData.planeEquation[i];
            let he = geometricalController.faceData.hExtIndex[i];
            let hi = geometricalController.faceData.hIntIndices[i];
            valid = (p!=null && he!=null && hi!=null);
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "there are undifined face data";
        }
    }



    //Check that all the faces borders are well defined
    if(valid){
        let nb_he = geometricalController.halfEdgeData.count;
        for(let i=0; i<geometricalController.faceData.count; i++){
            let he  = geometricalController.faceData.hExtIndex[i][0];
            let hi = geometricalController.faceData.hIntIndices[i];

            let visited_edges = [];

            let j=0;
            let he_0 = he;
            //check that every border is a loop
            do{
                visited_edges = Utils.mergeListsWithoutDoubles(visited_edges,[he]);

                he = geometricalController.halfEdgeData.next(he);
                j++;
            }while(he_0!=he && j<=nb_he)
            valid = j<=nb_he;
            if(!valid){
                issue = "exterior loop issue";
                break;
            }

            for(let k=0; k<hi.length; k++){
                let hi_0 = hi[k];
                let h    = hi_0;
                do{
                    visited_edges = Utils.mergeListsWithoutDoubles(visited_edges,[h]);
    
                    h = geometricalController.halfEdgeData.next(h);
                    j++;
                }while(hi_0!=h && j<=nb_he)
                valid = j<=nb_he;
                if(!valid){
                    break;
                }
            }
            if(!valid){
                issue = "interior loop issue";
                break;
            }
            //check that all the face's half-edge have been visited
            for(let k=0; k<geometricalController.halfEdgeData.count; k++){
                if(geometricalController.halfEdgeData.fIndex[k]==i){
                    valid = visited_edges.indexOf(k)!=-1;
                    if(!valid){
                        break;
                    }
                }
            }
            if(!valid){
                issue = "half-edge not visited";
                break;
            }
        }
        if(!valid){
            issue = "borders are not well defined : "+issue;
        }
    }

    //Check that all points have just one well defined half-edges orbit
    if(valid){
        let nb_he = geometricalController.halfEdgeData.count;
        for(let i=0; i<geometricalController.pointData.count; i++){
            let he  = geometricalController.pointData.heIndex[i][0];

            let visited_edges = [];

            let j=0;
            let he_0 = he;
            //check that every orbit is a loop
            do{
                visited_edges = Utils.mergeListsWithoutDoubles(visited_edges,[he]);

                he = geometricalController.halfEdgeData.opposite(he);
                he = geometricalController.halfEdgeData.next(he);
                j++;
            }while(he_0!=he && j<=nb_he)
            valid = j<=nb_he;
            if(!valid){
                break;
            }

            
            //check that all the point's half-edge have been visited
            for(let k=0; k<geometricalController.halfEdgeData.count; k++){
                if(geometricalController.halfEdgeData.pIndex[k]==i){
                    valid = visited_edges.indexOf(k)!=-1;
                    if(!valid){
                        break;
                    }
                }
            }
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "points' orbits are not well defined";
        }
    }

    //Check that all edges are well defined
    if(valid){
        for(let i=0; i<geometricalController.halfEdgeData.count; i++){
            let he  = i;
            let he_o  = geometricalController.halfEdgeData.opposite(he);
            let he_oo  = geometricalController.halfEdgeData.opposite(he_o);

            valid = (he!=he_o) && (he==he_oo);
            
            if(!valid){
                break;
            }
        }
        if(!valid){
            issue = "edges are not well defined";
        }
    }

    //Check that all the faces adjacent to a point intersects in one only point
    if(valid){
        let error_point_id = 0;
        for(let i=0; i<geometricalController.pointData.count; i++){
            let faces = geometricalController.findAdjacentFaces(i);
            let values = [];
            faces.forEach(face_id => {
                values.push([...geometricalController.faceData.planeEquation[face_id]]);
            });
            let supportEdges = geometricalController.findSupportAdjacentFaces(i);
            supportEdges.forEach(e=>{
                values.push([...geometricalController.edgeData.supportPlanEquation[e]]);
            });
            let M = new ExactMatrix(values);
            let rank = M.rank();
            valid = rank==3;
            if(!valid){
                error_point_id = i;
                break;
            }
        }
        if(!valid){
            issue = "Adjacent faces does not intersect on point "+error_point_id+" (rank="+rank+")";
        }
    }

    //Check that the point calculated belongs to all the support planes of its adjacent faces
    if(valid){
        let error_point_id = 0;
        let error_plane_id = {'type':null, 'id':null};
        for(let i=0; i<geometricalController.pointData.count; i++){
            let [x,y,z] = geometricalController.computeExactCoords(i);
            let faces = geometricalController.findAdjacentFaces(i);
            let supportEdges = geometricalController.findSupportAdjacentFaces(i);
            for(let j=0; j<faces.length; j++){
                let face_id = faces[j];
                let [a,b,c,d] = geometricalController.faceData.planeEquation[face_id];
            
                valid = a.mul(x).add(b.mul(y)).add(c.mul(z)).add(d).isZero();
                if(!valid){
                    error_plane_id.type="plane in face";
                    error_plane_id.id = face_id;
                    console.log(a.mul(x).add(b.mul(y)).add(c.mul(z)).add(d).toNumber());
                    break;
                }
            };

            for(let j=0; j<supportEdges.length; j++){
                let e_id = supportEdges[j];
                let [a,b,c,d] = geometricalController.edgeData.supportPlanEquation[e_id];
            
                valid = a.mul(x).add(b.mul(y)).add(c.mul(z)).add(d).isZero();
                if(!valid){
                    error_plane_id.type="support plane in edge";
                    error_plane_id.id = e_id;
                    console.log(a.mul(x).add(b.mul(y)).add(c.mul(z)).add(d).toNumber());
                    break;
                }
            }
            
            if(!valid){
                error_point_id = i;
                break;
            }
        }
        if(!valid){
            issue = "Point "+error_point_id + " does not belong to "+error_plane_id.type+" "+error_plane_id.id;
        }
    }




    if(valid){
        console.log(geometricalController, "VALID");
    }
    else{
        console.warn(geometricalController, "NOT VALID, "+issue);
    }
    
    return valid;
    
}

export{isTopologicallyValid}