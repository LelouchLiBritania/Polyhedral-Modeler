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
}


class Vertex{
    constructor(point, halfEdge, supportPlane){
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
            if(h.edge.supportPlane){
                supportEdges.push(h.edge);
            }
            h = h.opposite.next;
        }while(h!=this.halfEdge)

        return supportEdges;
    }

    savePointPosition(){
        
        if(plans.length<3){
            console.error("Underconstrained plan")
        }
        else{
        ////Algorithme du pivot de gauss
            let A_values = [];
            let D_values = [];
            //Initilisation du système d'équations
            plans.forEach(plan=>{
                A_values.push(plan.slice(0,3));
                D_values.push([plan[3]]);
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
    constructor(halfEdge, supportPlane){
        this.halfEdge = halfEdge;
        this.supportPlane = supportPlane;
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