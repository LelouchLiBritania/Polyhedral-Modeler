

# User Documentation





![window_overview](/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/window_overview.png)



## 1 to 4 - Display features

- 1 - ![wireframe_switch](./img/doc/wireframe_switch.png) Displays the object with solid wireframes <img src="./img/doc/wireframe.png" alt="wireframe" style="zoom:30%;" />
- 2 - ![cell_id_switch](./img/doc/cell_id_switch.png) Displays the id of the faces, edges and vertices <img src="./img/doc/cell_id.png" alt="cell_id" style="zoom:30%;" /> 
- 3 - ![dual_switch](./img/doc/dual_switch.png) Displays the dual of the object in a new scene <img src="./img/doc/dual.png" alt="dual" style="zoom:30%;" />
- 4 - Work in progress





## 5 - Tools

Two tools are proposed in this modeler : 

- ![](./static/img/icones_toolbox/icone_navig.png) The **navigation** mode, to navigate in the scene.
- ![icone_select_object](./static/img/icones_toolbox/icone_select_object.png) The **selection** mode, to select a new mesh to modify.
- ![](./static/img/icones_toolbox/icone_shift.png) The **Face-Shift**, which move a face along its normal.
- ![](./static/img/icones_toolbox/icone_flip_edge.png) The **Edge-Flip**, which changes the faces adjacent to an edge.



## 6-8 - Other features

- ![mock_import](/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/mock_import.png) A set of test object that can be imported directly.
- ![file_import](/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/file_import.png) Import of CityJSON file.
- ![dual_embedding](/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/dual_embedding.png) Selection of the geometrical embedding of the dual.



## Automatic processes

Four automatic processes, called topological events, can be triggered during the shift of a face, to resolve geometrical issues, like the non definition of a vertex position or the creation of self-intersections.

- <img src="/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/edge_collapse.png" alt="edge_collapse" style="zoom:50%;" /> **Edge-Collapse** : Transform an edge into a vertex when its length become null.
- <img src="/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/vertex_split.png" alt="vertex_split" style="zoom:50%;" /> **Vertex-Split** : Transform a vertex into an edge if it is adjacent to more than 4 faces. 														(The vertex must be in the border of the shifted face).
- <img src="/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/face_collapse.png" alt="face_collapse" style="zoom:50%;" /> **Face-Collapse** : Transforms a face into an edge or a vertex if its area 																	becomes null.
- <img src="/home/FGeniet/Thèse/Codes/git-repo/3D-Viewer/img/doc/edge_split.png" alt="edge_split" style="zoom:50%;" /> **Edge-Split** : Transforms an edge into a face if its adjacent faces are co-planar. 															(The edge must be in the border of the shifted face).

