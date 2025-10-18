### **Game Generation Design**

To create a consistent and playable game board, I made some rules. I did leave out preventing 50/50 choices and will leave it as a optional feature after the game has been made, the focus is on solving generation and making reliable gameplay that i would play.

#### **Generation Rules**

1. **Cell Connectivity**

   * A cell cannot have all 9 neighboring cells as mines.
   * All non-mine cells must be connected to each other.
   * This is verified using a flood fill algorithm:

     * If the number of connected non-mine cells does not equal the total number of cells minus the number of mines, the setup is considered invalid.

2. **Mine Isolation Prevention**

   * No mine should be completely surrounded by other mines.
   * Each mine must have at least one valid path to a wall or non-mine area.
   * A flood fill check ensures that every mine is reachable and not fully enclosed.

3. **Safe Start Area**

   * Mines cannot be placed where the user clicks for the first time.
   * The first click must reveal approximately **20% of the board**.
   * A flood fill is used to ensure that the area around the initial click is clear of mines.

#### **Implementation Process**

To handle these rules, the generation process is divided into stages:

1. **Initial Mine Placement**

   * Randomly generate and place n number of mines across the grid.

2. **First Click Handling**

   * When the user clicks for the first time, perform a flood fill with a maximum discovery limit of 20% of total cells.
   * If a mine is found in this region, it is either pushed in the opisit direction from the center or randomly repositioned after the flood fill completes depednidng on computation needed or use both as fallback.
   * Cells in this region are then marked as empty, while the rest remain unassigned.

3. **Mine Connectivity Validation**

   * Use flood fill to ensure each mine is connected to at least one wall.
   * This step is performed before non-mine cell checks to reduce redundant validation loops.

4. **Cell Connectivity Validation**

   * Use flood fill again to confirm that all empty (non-mine) cells are connected.
 
 5. **Fallback**
  * if either of 4-5 rules fail:
    * if the scenario dosent identify a mine that is the cause like amine being surrounded by 9 mines where we could move the 9 mines or a percentage of them we
    * randomly shift mines by 1 to 2 cells then re check, this is done a max of 3 tries
    * if that fails we can replace all mines
    * but these are unlikley and only will be added if i can at the end
---

Would you like me to make a **short version** (around half the length) for including in a development log or reflective report section?


...
