// ############################################################################
// # 
// #	Recursive Exporter for Adobe Illustrator v1.3
// #      Modified by Nick Gressle
// #	
// #	This work is licensed under the Creative Commons 
// #	Attribution-NonCommercial-ShareAlike 2.5 License. 
// #	
// #	To view a copy of this license, visit 
// #	http://creativecommons.org/licenses/by-nc-sa/2.5/
// #	
// ############################################################################

// Safely retrieve the zOrder for the specified object
function zOrder(o)
{
    if (o.typename == ("Layer")) 
    {
        return o.zOrderPosition;
    }
    else
    {
        return o.ZOrderPosition;
    }
}

// Comparator between two objects
function sortByZOrder(a, b)
{
    try
    {
        return zOrder(a) - zOrder(b);
    }
    catch (e)
    {
        // alert('a: ' + a.name + ":" + a.typename + ', b: ' + b.name + ":"  + b.typename + '\n' + e);
        return 0;
    }
}

// Concats all the items in a collection to an array
function concatAll(array, items)
{
	if (items == null)
	{
		// Nothing to add
		return;
	}
	
    result = array;
    for (var i = 0; i < items.length; i++)
    {
        result = result.concat(items[i]);
    }
    
    return result;
}

// Retrieves all sub-items of the specified object
function getAllItems(obj)
{
    var subObjects = new Array(); 
    
    subObjects = concatAll(subObjects, obj.pageItems);
    
    if (obj.typename == 'Layer')
    {
        subObjects = concatAll(subObjects, obj.layers);
    }

    return subObjects;
}

// Calculate the bounds for the object
function calculateVisibleBounds(obj)
{
    var bounds = new Array(4);
    
    bounds[0] = 0;
    bounds[1] = 0;
    bounds[2] = 0;
    bounds[3] = 0;
    
    if (!isVisible(obj)) 
    {
        return bounds;
    }
    
    // If the object has visible bounds calculated
    // thanks to illustrator, then use it
    if (obj.visibleBounds != null) 
    {
        return obj.visibleBounds;
    }

    // Otherwise, recursively descend into all items and use the largest bounds that cover them all
    try 
    {
        items = getAllItems(obj);

        bounds[0] = 99999;
        bounds[1] = -99999;
        bounds[2] = -99999;
        bounds[3] = 99999;
        
        for (var i = 0; i < items.length; i++)
        {
            var itemBounds = calculateVisibleBounds(items[i]);
            
            if (itemBounds[0] < bounds[0]) 
            {
                bounds[0] = itemBounds[0] ;
            }
            if (itemBounds[1] > bounds[1]) 
            {
                bounds[1] = itemBounds[1];
            }
            if (itemBounds[2] > bounds[2]) 
            {
                bounds[2] = itemBounds[2];
            }
            if (itemBounds[3] < bounds[3]) 
            {
                bounds[3] = itemBounds[3];
            }
        }
    }
    catch(e)
    {
        alert("While working on obj: " + obj + " encountered an error:\n" + e);
    }
    
    return bounds;
}

// Method to check visibility
function isVisible(obj)
{
    if (obj.typename == 'Layer') 
    {
        return obj.visible;
    }
    
    return !obj.hidden;
}

// Method to set visibility
function setVisibility(obj, visibility)
{
    if (obj.typename == 'Layer') 
    {
        obj.visible = visibility;
        return;
    }
    
    if (visibility)
    {
        obj.hidden = false;
    }
    else
    {
        obj.hidden = true;
    }
}

// Run the exporter on the content of the collection
function doLevel(collection, level, maxLevel, originalBounds, targetFolder, prefix)
{
	var gbounds;
	
    if (targetFolder == null) 
    {
        throw new "Illegal argument, target folder is null.";
    }
    
    var toDo = new Object();
    
    // Collect the visible (and unlocked) and hide them
    for (var i = 0; i < collection.length; i++)
    {
        var current = collection[i];
        
        if (isVisible(current) && (current.locked == false) && (current.printable == true))
        {
            toDo[i] = current;
            setVisibility(current, false);
        }
    }
    
    // Now iterate and recursively export each
    for (i in toDo)
    {
        current = toDo[i];
        setVisibility(current, true);
        
        try 
        {
            // Set bounds This is for all of your export specifications
			gbounds = calculateVisibleBounds(current);
			gbounds[2] = gbounds[2] + 2;
			gbounds[3] = gbounds[3] - 2;
            app.activeDocument.cropBox = gbounds;
            
            // Export
            var name = current.name;
            if (prefix != null) 
            {
                name = prefix + "-" + name;
            }
            
            // Preserve the langugage component by swapping out the . with _
            if( name.indexOf( "." ) > -1 ) {
                name = name.split(".").join("_");
            }
            
            var filename = targetFolder.toString() + "/" + name;
            var exportOptions = new ExportOptionsPNG24();
            var type = ExportType.PNG24;
            var fileSpec = new File(filename);
            exportOptions.antiAliasing = true;
            exportOptions.transparency = true;
            exportOptions.saveAsHTML = false;
			// exportOptions.ArtBoardClipping = false;
            app.activeDocument.exportFile(fileSpec, type, exportOptions );
        }
        catch (e)
        {
            alert(e);
        }
        
        if (level < maxLevel)
        {
        	items = getAllItems(current);
        	
        	// Not all objects are container ;)
        	if (items != null) 
        	{
	            doLevel(items, level + 1, maxLevel, originalBounds, targetFolder, name);
	        }
        }
        
        setVisibility(current, false);
    }    
    
    // Unhide them
    for (i in toDo)
    {
        current = toDo[i];
        setVisibility(current, true);
    }
}

// Run the script
function main()
{
	// Save the crop box
	originalBounds = app.activeDocument.cropBox;

	// Select target folder
	var targetFolder = Folder.selectDialog('Select an output folder', app.activeDocument.path.parent);
	if (targetFolder == null)
	{
		// Cancelled
		return;
	}

	var levels = prompt('How deep to recursively export (0 - only the top layer(s), 1 - subgroups of top layer(s), ...):', 0, 'Recursive Exporter');
	if (levels == null)
	{
		// Cancelled
		return;
	}

	var levelsNum = parseInt(levels);

	// Build Your Export Tasks
	doLevel(app.activeDocument.layers, 0, levelsNum, originalBounds, targetFolder, null);

	// Restore original crop box
	app.activeDocument.cropBox = originalBounds;

	// Inform completion
	alert("Done.");
}

// The global script body
main();
