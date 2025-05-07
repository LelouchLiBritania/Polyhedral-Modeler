import { ExactMathPlane, ExactMathPoint } from "./ExactMathGeometry";


class HalfEdgeStructure{
    constructor(vertices, halfEdges, edges, faces){
        this.vertices = vertices;
        this.halfEdges = halfEdges;
        this.edges = edges;
        this.faces = faces;
    }

    savePointsPositions(){
        this.vertices.forEach(vertex => {
            vertex.savePointPosition()
        });
    }

    updateSupportPlans(){
        this.edges.forEach(edge=>{
            let faces = edge.getAdjacentFaces();
            let values = [];

            let plane1 = faces[0].plane;
            let plane2 = faces[1].plane;
            values.push(plane1.toExactArray());
            values.push(plane2.toExactArray());
            
            let M = new ExactMatrix(values);
            if(M.rank()<2){
                edge.underconstrained=true;
                let [a,b,c,d]=plane1.toExactArray();
                let n = [a,b,c];
                let p1 = v1.getPointPosition();
                let p2 = v2.getPointPosition();
                let v = [p2[0].sub(p1[0]),p2[1].sub(p1[1]),p2[2].sub(p1[2])];
                let n_support = Utils.normalize(Utils.crossProduct(n,v));
                let d_support = Utils.dotProduct(n_support, p1).neg();
                edge.supportPlane=new ExactMathPlane(...n_support, d_support);
            }
            else{
                edge.underconstrained = false;
                edge.supportPlane = null;
            }
        })
    }

    updateEmbeddedPlans(){
        this.vertices.forEach(vertex=>{
            if(!vertex.embeddedPlane){
                vertex.embeddedPlane = vertex.computeDefaultEmbeddedPlan();
            }
            let [x,y,z] = vertex.getPointPosition();
            let [a,b,c,d] = vertex.embeddedPlane.toExactArray();
            //console.log(i,x,y,z,a,b,c);
            vertex.embeddedPlane.d = a.neg().mul(x).sub(b.mul(y)).sub(c.mul(z));
        });

        this.edges.forEach(edge=>{
            if(!edge.embeddedPlane){
                edge.embeddedPlane = edge.computeDefaultEmbeddedPlan();
            }
            
            let [v0,v1] = edge.getAdjacentVertices();

            let [x0,y0,z0] = v0.getPointPosition();
            let [x1,y1,z1] = v1.getPointPosition();
            let [a,b,c,d]  = edge.embeddedPlane.toExactArray();
            let d0 = a.neg().mul(x0).sub(b.mul(y0)).sub(c.mul(z0));
            let d1 = a.neg().mul(x1).sub(b.mul(y1)).sub(c.mul(z1));
            edge.embeddedPlane.d = d0.add(d1).div(N(2));
        });
    }

    /**
     * Degenerate a face with only 2 edges in its border
     * @param {*} faceId 
     */
    degenerateFace(face){

        let plane = face.plane;
        
        let h    = face.exteriorHalfEdge;
        let h_o  = h.opposite;
        let h_n  = h_o.next;
        let h_no = h_n.opposite;
        let e1   = h.edge;
        let e2   = h_n.edge;


        let v1 = h.origin;
        let v2 = h_n.origin;



        //change the half-edges and edges pointers
        h_o.opposite  = h_no;
        h_no.opposite = h_o;
        h_no.edge     = e1;

        e1.halfEdge   = h_o;

        //change the vertices pointers
        
        if(p1.halfEdge==h){
            p1.halfEdge=h_no;
        }
        if(p2.halfEdge==h_n){
            p2.halfEdge=h_o;
        }

        e1.embeddedPlane = plane;
        e1.supportPlane  = plane;

        //Delete edges, half-edges and face
        this.deleteFace(face);
        this.deleteEdge(e2);
        this.deleteHalfEdge(h);
        this.deleteHalfEdge(h_n);

        this.updateSupportPlans();

        //Degenrate the edge if it needs to be
        let faces1 = v1.findAdjacentFaces();
        let faces2 = v2.findAdjacentFaces();
        let faces = Utils.mergeListsWithoutDoubles(faces1, faces2);

        let values = [];
        faces.forEach(face=>{
            values.push([...face.plane.toExactArray()]);
        });
        let M = new ExactMatrix(values);
        if(M.rank()<=3){
            console.log("DEGENERATE EDGE FROM FACE DEGEN");
            this.degenerateEdge(e1);
        }
    }

    degenerateEdge(edge){
        let plane = [...edge.embeddedPlane.toExactArray()];

        let h   = edge.halfEdge;
        let h_o = h.opposite;
        let v1  = h.origin;
        let v2  = h_o.origin;
        let f1  = h.face;
        let f2  = h_o.face;
        
        let h_p   = h.previous();
        let h_n   = h.next;
        let h_op  = h_o.previous();
        let h_on  = h_o.next;
        let h_no  = h_n.opposite;
        let h_non = h_no.next();

        let hf=h_n;

        do{
            h_f.origin = p1;
            hf = h_f.opposite.next;
        }while(hf!=h_o)

        h_p.next = h_n;
        h_op.next = h_on;
        

        if(f1.exteriorHalfEdge==h){
            f1.exteriorHalfEdge=h_n;
        }
        if(f2.exteriorHalfEdge==h_o){
            f2.exteriorHalfEdge=h_on;
        }

        if(p1.halfEdge==h){
            p1.halfEdge=h_n;
        }

        for(let i=0; i<f1.interiorHalfEdges.length; i++){
            if(f1.interiorHalfEdges[i]==h){
                f1.interiorHalfEdges[i]=h_n
            }
        }
        for(let i=0; i<f2.interiorHalfEdges.length; i++){
            if(f2.interiorHalfEdges[i]==h_o){
                f2.interiorHalfEdges[i]=h_on
            }
        }

        this.deleteEdge(edge);
        this.deleteHalfEdge(h);
        this.deleteHalfEdge(h_o);
        this.deletePoint(v2);

        v1.embeddedPlane = plane;

        this.updateEmbeddedPlans();
        this.updateSupportPlans();
    }

    splitVertexIntoFace(vertex){
        let plane = vertex.embeddedPlane;

        let h = vertex.halfEdge;

        //Creation of the n-1 other points
        let vertices = [vertex];
        let he = h.opposite.next;
        do{
            let new_vertex = new Vertex([0,0,0], he);
            vertices.push(new_vertex);
            he.origin = new_vertex;
            he = he.opposite.next;
        }while(he!=h)

        //Création of the 2n new halfEdges, the n new edges, 
        //and update of the others, plus the point's halfEdge pointers
        let exterior_half_edges = [];
        let interior_half_edges = [];
        he = h;
        let i=0;
        let new_face = new Face(plane, null, []);
        let n        = vertices.length;
        do{
            halfEdges.push(this.halfEdgeData.count,this.halfEdgeData.count+1);
            
            
            let he_o = he.opposite;
            let he_on = he_o.next;
            //f_id of the external he
            let ext_face = he_o.face;
           
            //creation
            let new_edge = new Edge(null);
            let new_halfedge_ext = new HalfEdge(vertices[i], null, he_on, ext_face,new_edge);
            let new_halfedge_int = new HalfEdge(vertices[i], null, null, new_face,null);
            new_edge.edge = new_halfedge_ext;
            exterior_half_edges.push(new_halfedge_ext);
            interior_half_edges.push(new_halfedge_int);

            //update
            he_o.next = new_halfedge_ext;

            let n = interior_half_edges.length;
            for(let i=0; i<n; i++){
                let half_edge_int = interior_half_edges[i];
                let half_edge_ext = exterior_half_edges[(n+i-1)%n];
                half_edge_ext.opposite = half_edge_int;
                half_edge_int.opposite = half_edge_ext;
                half_edge_int.edge = half_edge_ext.edge;
                half_edge_int.next = interior_half_edges[(n+i-1)%n];
            }
            
            he = he_on;
            i++;
        }while(he!=h)

        //Update the new face
        new_face.exteriorHalfEdge = interior_half_edges[0];
    }



    splitEdgeIntoFace(cellId, cellType, planEquation=null){
        //bis edge 
        if(cellType==1){
            let edgeId = cellId;
            let planEquation = this.edgeData.embeddedPlanEquation[edgeId];
            console.log(ExactMathUtils.exactArrayToFloatArray(this.edgeData.embeddedPlanEquation[edgeId]));
            let h  = this.edgeData.heIndex[edgeId];
            let ho = this.halfEdgeData.opposite(h);

            let p0 = this.halfEdgeData.vertex(h);
            let p1 = this.halfEdgeData.vertex(ho);

            //Creation of the new points

            let pointsIds0 = [p0];
            let he = this.halfEdgeData.opposite(h);
            he = this.halfEdgeData.next(he);
            let h_p = this.halfEdgeData.previous(h);
            let h_po = this.halfEdgeData.opposite(h_p);
            do{
                pointsIds0.push(this.pointData.count);
                this.halfEdgeData.pIndex[he] = this.pointData.count;
                this.pointData.add(he, [NaN,NaN,NaN,NaN]);
                he = this.halfEdgeData.opposite(he);
                he = this.halfEdgeData.next(he);
            }while(he!=h_po)

            let pointsIds1 = [p1];
            he = this.halfEdgeData.opposite(ho);
            he = this.halfEdgeData.next(he);
            let h_op = this.halfEdgeData.previous(ho);
            let h_opo = this.halfEdgeData.opposite(h_op);
            do{
                pointsIds1.push(this.pointData.count);
                this.halfEdgeData.pIndex[he] = this.pointData.count;
                this.pointData.add(he, [NaN,NaN,NaN,NaN]);
                he = this.halfEdgeData.opposite(he);
                he = this.halfEdgeData.next(he);
            }while(he!=h_opo)

            //Création of the 2n new halfEdges, the n new edges, 
            //and update of the others, plus the point's halfEdge pointers
            //for each vertex of the edge

            //for P0
            let i=1;
            he = this.halfEdgeData.next(ho);
            let newFace_id = this.faceData.count;
            let n_he = this.halfEdgeData.count;
            let n0    = pointsIds0.length;
            let n_e  = this.edgeData.count;


            let halfEdges0 = [this.halfEdgeData.count, h];


            this.halfEdgeData.add(p0, n_he+2*(n0-1) , n_he+2*n0-3, newFace_id, n_e);
            this.edgeData.add(halfEdges0[0]);

            
            do{
                halfEdges0.push(this.halfEdgeData.count,this.halfEdgeData.count+1);
                let he_o = this.halfEdgeData.opposite(he);
                let he_on = this.halfEdgeData.next(he_o);
                //f_id of the external he
                let f_id = this.halfEdgeData.fIndex[he_on];
                //opposites id
                let oppId1 = this.halfEdgeData.count-1;
                if(i==1){
                    oppId1 = ho;
                }
                let oppId2 = this.halfEdgeData.count+2;
                if(i==n0-1){
                    oppId2 = this.halfEdgeData.count-(2*n0-3)
                }
                //next id
                let nextId1 = this.halfEdgeData.count-2;
                if(i==1){
                    nextId1 = this.halfEdgeData.count+(2*(n0-1));
                }

                let nextId2 = he_on;

                //update
                this.halfEdgeData.nextIndex[he_o] = this.halfEdgeData.count+1;
                this.halfEdgeData.pIndex[he] = pointsIds0[i];
                this.pointData.heIndex[pointsIds0[i]] = [this.halfEdgeData.count];

                //creation
                this.edgeData.add(this.halfEdgeData.count, [NaN,NaN,NaN,NaN]);
                this.halfEdgeData.add(pointsIds0[i], oppId1, nextId1, newFace_id, n_e+i);
                this.halfEdgeData.add(pointsIds0[i], oppId2, nextId2, f_id, n_e+((i+1)%(n0)));
                
                he = he_on;
                i++;
            }while(he!=h_po)

            //console.log(this.halfEdgeData.count);


            //For P1

            he = this.halfEdgeData.next(h);
            i=1;
            n_he = this.halfEdgeData.count;
            let n1    = pointsIds1.length;
            n_e  = this.edgeData.count;


            let halfEdges1 = [this.halfEdgeData.count, ho];

            this.halfEdgeData.eIndex[ho] = this.halfEdgeData.eIndex[halfEdges0[2]];


            this.halfEdgeData.add(p1, n_he+2*(n1-1) , n_he+2*n1-3, newFace_id, n_e);
            this.edgeData.add(halfEdges1[0]);


            
            do{
                halfEdges1.push(this.halfEdgeData.count,this.halfEdgeData.count+1);
                let he_o = this.halfEdgeData.opposite(he);
                let he_on = this.halfEdgeData.next(he_o);
                //f_id of the external he
                let f_id = this.halfEdgeData.fIndex[he_on];
                //opposites id
                let oppId1 = this.halfEdgeData.count-1;
                if(i==1){
                    oppId1 = h;
                }
                let oppId2 = this.halfEdgeData.count+2;
                if(i==n1-1){
                    oppId2 = this.halfEdgeData.count-(2*n1-3)
                }
                //next id
                let nextId1 = this.halfEdgeData.count-2;
                if(i==1){
                    nextId1 = halfEdges0[0];
                }

                let nextId2 = he_on;

                //update
                this.halfEdgeData.nextIndex[he_o] = this.halfEdgeData.count+1;
                this.halfEdgeData.pIndex[he] = pointsIds1[i];
                this.pointData.heIndex[pointsIds1[i]] = [this.halfEdgeData.count];

                //creation
                let e_id1 = n_e+i-2;
                if(i==1){
                    e_id1 = edgeId;
                }
                else{
                    this.edgeData.add(this.halfEdgeData.count, [NaN,NaN,NaN,NaN]);
                }
                this.halfEdgeData.add(pointsIds1[i], oppId1, nextId1, newFace_id, e_id1);
                this.halfEdgeData.add(pointsIds1[i], oppId2, nextId2, f_id, n_e+((i)%(n1-1)));
                //console.log(((i-1)%(n1-2)))
                
                
                //console.log(i);
                he = he_on;
                i++;
            }while(he!=h_opo)





            

            //change h and ho opposites
            this.halfEdgeData.oppIndex[h]  = halfEdges1[2];
            this.halfEdgeData.oppIndex[ho] = halfEdges0[2];

            //change ho edge
            this.halfEdgeData.eIndex[ho] = this.halfEdgeData.eIndex[this.halfEdgeData.opposite(ho)];

            //change p0, p1 halfEdge pointer
            this.pointData.heIndex[p0]  = [h];
            this.pointData.heIndex[p1]  = [ho];

            //Creation of the face
            this.faceData.add([halfEdges0[0]],[],planEquation);
            this.printFace(newFace_id);


        }


        if(!this.isCopy && !this.isDual){
            isTopologicallyValid(this);
        }
        this.updateEmbeddedPlans();
        this.updateSupportPlans();

    }

    deleteVertex(vertex){
        let vertex = this.vertices.splice(this.vertices.indexOf(vertex),1);
        this.halfEdges.forEach(halfEdge=>{
            if(halfEdge.origin==vertex){
                halfEdge.origin=null;
            }
        });
    }

    deleteHalfEdge(halfEdge){
        let halfEdge = this.halfEdges.splice(this.vertices.indexOf(halfEdge),1);

        this.vertices.forEach(vertex=>{
            if(vertex.halfEdge==halfEdge){
                vertex.halfEdge=null;
            }
        });

        this.edges.forEach(edge=>{
            if(edge.halfEdge==halfEdge){
                edge.halfEdge=null;
            }
        });

        this.halfEdges.forEach(halfEdge=>{
            if(halfEdge.opposite==halfEdge){
                halfEdge.opposite=null;
            }
            if(halfEdge.next==halfEdge){
                halfEdge.next=null;
            }
        });

        this.faces.forEach(face=>{
            if(face.exteriorHalfEdge==halfEdge){
                face.exteriorHalfEdge=null;
            }
            for(let j=0; j<face.interiorHalfEdges.length; j++){
                if(face.interiorHalfEdges[j]==halfEdge){
                    face.interiorHalfEdges.splice(j,1);
                }
            }
        });
    }

    deleteEdge(edge){
        let edge = this.edges.splice(this.vertices.indexOf(edge),1);

        this.halfEdges.forEach(halfEdge=>{
            if(halfEdge.edge==edge){
                halfEdge.edge=null;
            }
        });
    }

    deleteFace(face){
        let face = this.faces.splice(this.vertices.indexOf(face),1);

        this.halfEdges.forEach(halfEdge=>{
            if(halfEdge.face==face){
                halfEdge.face=null;
            }
        });
    }


}


class Vertex{
    constructor(point, halfEdge, supportPlane=null){
        this.point = point;
        this.halfEdge = halfEdge;
        this.supportPlane = supportPlane;
        this.embeddedPlane = null;
    }

    getAdjacentFaces(){
        let faces = [];
        let h = this.halfEdge;
        do{
            faces.push(h.face);
            h = h.opposite.next;
        }while(h!=this.halfEdge)
        return faces;
    }

    getAdjacentSupportEdges(){
        let supportEdges = [];
        let h = this.halfEdge;
        do{
            if(h.edge.supportPlane){
                supportEdges.push(h.edge);
            }
            h = h.opposite.next;
        }while(h!=this.halfEdge)

        return supportEdges;
    }

    getAdjacentHalfEdges(){
        let halfEdges = [];
        let h = this.halfEdge;
        do{
            halfEdges.push(h);
            h = h.opposite.next;
        }while(h!=this.halfEdge)

        return supportEdges;
    }

    savePointPosition(){
        this.point = new ExactMathPoint(...this.getPointPosition());
    }

    getPointPosition(){

        let faces        = this.getAdjacentFaces();
        let supportEdges = this.getAdjacentSupportEdges();

        let planes = [];
        faces.forEach(face=>{
            planes.push(face.plane());
        })
        supportEdges.forEach(edge=>{
            planes.push(edge.supportPlane);
        })
        
        if(planes.length<3){
            console.error("Underconstrained plan")
        }
        else{
        ////Algorithme du pivot de gauss
            let A_values = [];
            let D_values = [];
            //Initilisation du système d'équations
            planes.forEach(plane=>{
                A_values.push(plane.toExactArray().slice(0,3));
                D_values.push([plane.toExactArray()[3]]);
            })
    
            let A = new ExactMatrix(A_values);
            let D = new ExactMatrix(D_values);
    
            let res = A.solve(D);
    
            //console.log(A, D);
    
            if(res.l!=0){
                return([res[0][0].neg(),res[1][0].neg(),res[2][0].neg()]);
            }
            else{
                return [NaN,NaN,NaN];
            }
    
        }
    }

    computeDefaultEmbeddedPlan(){
            
        let faces = this.getAdjacentFaces();

        let plane = new ExactMathPlane(0,0,0,0);
        let n = faces.length;
        for(let i=0; i<n; i++){
            plane = plane.add(faces[i].plane);
        }
        plane.div(N(n));
        return(plane);

    }

}

class HalfEdge{
    constructor(origin, opposite, next, face, edge){
        this.origin = origin;
        this.opposite = opposite;
        this.next = next;
        this.face = face;
        this.edge = edge;
    }

    previous(){
        let h = this.next;
        while(h.next!=this){
            h=h.next;
        }
        return h;
    }
}

class Edge{
    constructor(halfEdge, supportPlane=null, underconstrained=false){
        this.halfEdge = halfEdge;
        this.supportPlane = supportPlane;
        this.embeddedPlane = null;
        this.underconstrained = underconstrained;
    }

    getAdjacentFaces(){
        let h1 = this.halfEdge;
        let h2 = h1.opposite;

        return [h1.face, h2.face];

    }

    getAdjacentVertices(){
        let h1 = this.halfEdge;
        let h2 = h1.opposite;

        return [h1.origin, h2.origin];

    }

    computeDefaultEmbeddedPlan(){
        let plane = new ExactMathPlane(0,0,0,0);

        let [face0,face1] = this.getAdjacentFaces();

        
        plane = face0.plane.add(face1.plane);

        let n = plane.normal().normeApproximation();
        plane = plane.div(n);

        return plane;

    }
}

class Face{
    constructor(plane, exteriorHalfEdge, interiorHalfEdges){
        this.plane = plane;
        this.exteriorHalfEdge = exteriorHalfEdge;
        this.interiorHalfEdges = interiorHalfEdges;
    }
}




export{HalfEdgeStructure, Vertex, HalfEdge, Face, Edge}