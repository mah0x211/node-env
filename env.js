/* (C) Masatoshi Teruya */
"use strict";
var RE_ISARG = new RegExp( 
        '\\s+(' + 
        '-(\\w)(?:\\s+([^-][^\\s]*))?' + 
        '|' + 
        '--(\\w+)(?:=([^\\s]+))?' + 
        ')?', 
        'g'
    );

function makeUsage( cmd, opts )
{
    var res = ['Usage:'],
        idt2 = '  ',
        idt4 = '    ',
        usage = [idt2 + cmd],
        desc = [],
        labelMaxLen = 0;
    
    opts.forEach(function(opt)
    {
        var line = {},
            arg = undefined;
        
        if( opt.abbr ){
            line.label = '-' + opt.abbr;
            arg = '-' + opt.abbr;
        }
        if( opt.name ){
            line.label += ', --' + opt.name;
            arg = arg||('--' + opt.name);
        }
        
        if( arg )
        {
            desc.push(line);
            if( line.label.length > labelMaxLen ){
                labelMaxLen = line.label.length;
            }
            
            line.desc = opt.desc||'<no desc>';
            if( opt.def ){
                line.def = '[default] ' + opt.def;
            }
            
            if( opt.arg ){
                line.val = 'VAL=' + opt.arg;
                arg += ' ' + opt.arg;
            }
            
            if( opt.required ){
                line.required = true;
                usage.push( arg );
            }
            else {
                usage.push('[' + arg + ']');
            }
        }
    });
    
    res.push( usage.join(' ') );
    res.push('');
    res.push( 'Options:' );
    desc.forEach(function(item)
    {
        var sp = (new Array(labelMaxLen - item.label.length + 1)).join(' '),
            label = idt2 + item.label + sp + idt4 + ' : ',
            line = [label];
        
        line.push( item.desc );
        if( item.val ){
            line.push( '\n' + (new Array(label.length+1)).join(' ') );
            line.push( item.val );
        }
        if( item.required ){
            line.push( ' (required)' );
        }
        
        if( item.def ){
            line.push( '\n' + (new Array(label.length+1)).join(' ') );
            line.push( item.def );
        }
        res.push( line.join('') );
    });
    res.push('');
    
    return res.join('\n');
}

function parseArgv( opts )
{
    var args = { __proto__: null },
        argv = process.argv.join(' '),
        remain = argv,
        keys = [],
        name,val,res;
    
    opts.forEach(function(opt)
    {
        if( !opt.name ){
            throw new Error('option name<opt.name> must be required');
        }
        keys.push(opt.name);
        if( opt.abbr ){
            keys.push(opt.abbr);
        }
    });
    
    // parse command line arguments
    while( res = RE_ISARG.exec( argv ) )
    {
        if( ( name = res[2] ) ){
            val = res[3]||true;
        }
        else if( ( name = res[4] ) ){
            val = res[5]||true;
        }
        else {
            val = '';
        }
        
        if( name )
        {
            remain = remain.replace( res[1], '' );
            if( keys.indexOf( name ) !== -1 ){
                args[name] = val;
            }
        }
    }
    // append plain arguments
    args._ = remain.trim().split(' ').slice(2);
    
    return args;
}

function mergeArgv( args, opts )
{
    var error = [],
        keys = Object.keys( opts ),
        nkey = keys.length,
        i,opt,name,abbr;
    
    // check name and requirement
    for( i = 0; i < nkey; i++ )
    {
        opt = opts[keys[i]];
        name = opt.name;
        abbr = opt.abbr;
        
        if( !name ){
            name = abbr;
        }
        else if( args[abbr] )
        {
            // same option declare
            if( args[name] ){
                error.push( 'arguments --' + name + ' declaration is duplicated.' );
            }
            else {
                args[name] = args[abbr];
            }
            delete args[abbr];
        }
        if( name )
        {
            // value required
            if( name in args && opt.arg && !args[name] ){
                error.push( 'passed argument --' + name + ' value is undefined' );
            }
            // required option
            else if( opt.required && !args[name] ){
                error.push( 'required argument --' + name + ' is undefined' );
            }
        }
    }
    
    return ( error.length ) ? error : undefined;
}

function Env( opts, cmd )
{
    var obj = { __proto__: null },
        err = undefined;
    
    if( arguments.length < 2 || typeof cmd !== 'string' ){
        cmd = process.argv[1].split('/').pop();
    }
    if( arguments.length && opts instanceof Object ){
        opts = JSON.parse( JSON.stringify( opts ) );
    }
    else {
        opts = { __proto__: null };
    }
    
    // append env
    for( var p in process.env ){
        obj[p] = process.env[p];
    }
    // create usage
    obj.usage = makeUsage( cmd, opts );
    // parse command line arguments
    obj.argv = parseArgv( opts );
    // manipulate
    if( ( err = mergeArgv( obj.argv, opts ) ) )
    {
        obj.error = mergeArgv( obj.argv, opts );
        // freeze
        if( obj.error ){
            Object.freeze( obj.error );
        }
    }
    
    Object.freeze( obj.argv._ );
    Object.freeze( obj.argv );
    Object.freeze( obj );
    
    return obj;
}

module.exports = Env;

